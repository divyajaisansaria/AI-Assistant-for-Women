import os
import requests
from dotenv import load_dotenv

load_dotenv()

SHOPIFY_STORE = os.getenv("SHOPIFY_STORE") 
SHOPIFY_ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN") 

HEADERS = {
    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
    "Content-Type": "application/json"
}

def upload_product_to_shopify(product_data):
    payload = {
        "product": {
            "title": product_data.get("title", "Untitled Product"),
            "body_html": product_data.get("description", ""),
            "vendor": product_data.get("region", "Unknown"),
            "product_type": product_data.get("category", "Misc"),
            "tags": ", ".join(product_data.get("tags", [])),
            "variants": [
                {
                    "price": product_data.get("price", "0.00"),
                    "sku": product_data.get("sku", ""),
                    "option1": product_data.get("size", "Default"),
                    "option2": product_data.get("color", "Default")
                }
            ]
        }
    }

    # Add variant options only if available
    if "options" in product_data:
        payload["product"]["options"] = product_data["options"]

    response = requests.post(
        f"https://{SHOPIFY_STORE}/admin/api/2023-10/products.json",
        headers=HEADERS,
        json=payload
    )

    if response.status_code == 201:
        product_id = response.json()["product"]["id"]
        print(f"✅ Product uploaded to Shopify (ID: {product_id})")
        return response.json()
    else:
        print("❌ Failed to upload product:", response.status_code)
        print(response.text)
        return {
            "error": response.status_code,
            "details": response.text
        }
