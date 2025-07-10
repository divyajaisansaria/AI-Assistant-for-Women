import os
import shutil
import json
import re
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# Main function
async def generate_product_description(image_file, voice_text: str):
    if not voice_text.strip():
        return {"error": "Voice description is empty."}

    temp_image_path = f"temp_{image_file.filename}"
    with open(temp_image_path, "wb") as f:
        shutil.copyfileobj(image_file.file, f)

    try:
        pil_image = Image.open(temp_image_path)
    except Exception as e:
        os.remove(temp_image_path)
        return {"error": f"Invalid image format: {e}"}

    prompt = f"""
You are a smart product catalog assistant for Shopify.

You will be given:
- A product image (e.g., clothing, home decor, jewelry, etc.)
- A user-provided voice description in any Indian language (e.g., Hindi, Gujarati, Tamil, etc.): "{voice_text}"

Your job is to:
1. **First translate the description into English**
2. Then extract a complete product listing in **valid, plain JSON** using the schema below.
3. For now, assume the **price is ₹299** unless a different price is clearly mentioned by the user.

Schema:
{{
  "title": "...",
  "description": "...",
  "category": "...",
  "color": "...",
  "region": "...",
  "tags": ["...", "..."],
  "material": "...",
  "size": "...",
  "dimensions": "...",
  "weight": "... kg",
  "price": "...",
  "sku": "...",
  "options": [
    {{
      "name": "Size",
      "values": ["Small", "Medium", "Large"]
    }},
    {{
      "name": "Color",
      "values": ["Red", "Blue"]
    }}
  ],
  "seo": {{
    "page_title": "...",
    "meta_description": "..."
  }}
}}

✅ Always return valid **JSON only**
✅ Keep the **description under 160 words**
✅ If a field is missing, intelligently infer it based on description or image
✅ Omit `"options"` if there's only one variant
✅ Translate any local language input to English before processing
"""

    try:
        response = model.generate_content([prompt, pil_image])
        raw_output = response.text

        print("[Gemini Raw Output]:", raw_output)  # Debugging

        # Extract JSON block
        json_match = re.search(r"\{[\s\S]*\}", raw_output)
        if not json_match:
            return {
                "structured_data": None,
                "raw_output": raw_output,
                "error": "No JSON object found in Gemini output."
            }

        json_str = json_match.group(0)

        # Clean formatting issues
        json_str = json_str.replace("“", "\"").replace("”", "\"")
        json_str = json_str.replace("‘", "'").replace("’", "'")
        json_str = re.sub(r",\s*}", "}", json_str)  # Remove trailing commas
        json_str = re.sub(r",\s*]", "]", json_str)

        try:
            structured = json.loads(json_str)

            # ✅ Convert weight to integer grams
            weight = structured.get("weight", "")
            if isinstance(weight, str):
                match = re.match(r"([\d.]+)\s*kg", weight.strip().lower())
                if match:
                    kg = float(match.group(1))
                    structured["weight"] = int(kg * 1000)  # e.g., 0.4 kg → 400

            return {"structured_data": structured}

        except json.JSONDecodeError as e:
            return {
                "structured_data": None,
                "raw_output": json_str,
                "error": f"Gemini returned invalid JSON: {str(e)}"
            }

    except Exception as e:
        return {"error": str(e)}

    finally:
        os.remove(temp_image_path)
