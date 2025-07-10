from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import whisper
import tempfile
import os
import subprocess
import json
import traceback
import requests
from dotenv import load_dotenv
from typing import Optional


from ProductUpload.ProductDescription import generate_product_description
from utils.google_sheets import append_to_google_sheet
from utils.db import save_product_to_db, get_all_products
from utils.cloudinary_utils import upload_image
from utils.advertiser import scrape_and_message

# Load environment variables
load_dotenv()
SHOPIFY_STORE = os.getenv("SHOPIFY_STORE")  # e.g. kasvhi-creations8.myshopify.com
SHOPIFY_ADMIN_API_KEY = os.getenv("SHOPIFY_ADMIN_API_KEY")

# Shopify API headers
HEADERS = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": SHOPIFY_ADMIN_API_KEY
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper model
model = whisper.load_model("small")

class SaveSheetRequest(BaseModel):
    description: dict

class ProductSchema(BaseModel):
    title: str
    image_url: str
    color: Optional[str] = "N/A"
    material: Optional[str] = "N/A"
    size: Optional[str] = "N/A"
    price: Optional[str] = "N/A"


@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    tmp_in_path = None
    tmp_out_path = None
    try:
        # Save incoming file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_in:
            tmp_in.write(await audio.read())
            tmp_in_path = tmp_in.name

        # Convert to WAV for Whisper
        tmp_out_path = tmp_in_path.replace(".webm", ".wav")
        process = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_in_path, tmp_out_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        if process.returncode != 0:
            return JSONResponse(status_code=500, content={"error": f"FFmpeg failed: {process.stderr}"})

        # Step 1: Auto-detect language
        result_lang = model.transcribe(tmp_out_path, language=None)
        print(f"Detected language: {result_lang['language']}")
        lang_code = result_lang["language"]

        # Step 2: Transcribe again using detected language for better native script
        result = model.transcribe(tmp_out_path, language=lang_code)

        return {
            "transcription": result["text"].strip(),
            "language": lang_code
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Transcription failed: {str(e)}"})

    finally:
        for f in [tmp_in_path, tmp_out_path]:
            if f and os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

@app.post("/describe")
async def describe_product(
    images: list[UploadFile] = File(...),
    voice_text: str = Form(...)
):
    if not images:
        return {"error": "No images uploaded."}
    return await generate_product_description(images[0], voice_text)

@app.post("/save-to-sheet")
async def save_to_sheet(data: SaveSheetRequest):
    description = data.description
    if "structured_data" in description:
        description = description["structured_data"]
    append_to_google_sheet(description)
    return {"message": "Saved to Google Sheets!"}

@app.post("/save-to-db")
async def save_to_db(
    images: list[UploadFile] = File(...),
    description: str = Form(...)
):
    try:
        image_urls = [await upload_image(img) for img in images]
        description_json = json.loads(description)

        save_product_to_db({
            "images": image_urls,
            "description": description_json,
        })

        return {"message": "Saved to DB successfully!"}
    except Exception as e:
        print("❌ ERROR in /save-to-db:")
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/products")
def list_all_products():
    return get_all_products()

@app.post("/list-on-shopify")
async def list_on_shopify(product: dict):
    try:
        structured = (
            product.get("description", {}).get("structured_data")
            or product.get("description", {}).get("Structured Data")
            or {}
        )

        title = structured.get("title", "Untitled Product")
        body_html = structured.get("description", "No description provided")
        tags = structured.get("tags", [])
        product_type = structured.get("category", "")
        vendor = structured.get("region", "")
        material = structured.get("material", "")
        size = structured.get("size", "") or "Default"
        price = structured.get("price", "0.00")
        weight = float(structured.get("weight", 0) or 0)
        sku = structured.get("sku", "")
        images = [{"src": url} for url in product.get("images", [])]

        product_data = {
            "product": {
                "title": title,
                "body_html": body_html,
                "tags": tags,
                "vendor": vendor,
                "product_type": product_type,
                "images": images,
                "variants": [
                    {
                        "price": price,
                        "sku": sku,
                        "weight": weight,
                        "option1": size,
                    }
                ],
                "options": [
                    {
                        "name": "Size",
                        "values": [size]
                    }
                ]
            }
        }

        seo = structured.get("seo", {})
        if seo:
            product_data["product"]["metafields"] = [
                {
                    "namespace": "global",
                    "key": "title_tag",
                    "value": seo.get("page_title", ""),
                    "type": "single_line_text_field"
                },
                {
                    "namespace": "global",
                    "key": "description_tag",
                    "value": seo.get("meta_description", ""),
                    "type": "single_line_text_field"
                }
            ]

        print("📤 Shopify Payload:")
        print(json.dumps(product_data, indent=2))

        response = requests.post(
            f"https://{SHOPIFY_STORE}/admin/api/2024-04/products.json",
            headers=HEADERS,
            json=product_data
        )

        response.raise_for_status()
        return {"status": "success", "shopify_product": response.json()}

    except Exception as e:
        print("❌ Shopify Listing Error:", e)
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/scrape-store-info")
async def advertise_product(product: ProductSchema):
    try:
        scrape_and_message(product.dict())
        return {"status": "success", "message": "✅ Advertising initiated"}
    except Exception as e:
        return {"status": "error", "message": f"❌ {str(e)}"}