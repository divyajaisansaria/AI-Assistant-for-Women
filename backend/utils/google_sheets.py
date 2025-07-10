import os
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

load_dotenv()

# Auth setup
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds_path = os.getenv("GOOGLE_CREDS_PATH", "google-creds.json")
creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)
client = gspread.authorize(creds)


def init_google_sheet_headers(description_sample: dict):
    sheet_name = os.getenv("GOOGLE_SHEET_NAME")
    sheet = client.open(sheet_name).sheet1

    base_headers = [
        "Title", "Description", "Category", "Color", "Region", "Tags",
        "Material", "Size", "Dimensions", "Weight", "Price", "SKU"
    ]

    # Dynamically extract option names
    option_names = [
        f"Option: {opt['name']}"
        for opt in description_sample.get("options", [])
        if "name" in opt
    ]

    seo_headers = ["SEO Page Title", "SEO Meta Description"]

    headers = base_headers + option_names + seo_headers

    sheet.delete_rows(1)  # clear first row
    sheet.insert_row(headers, index=1)


def append_to_google_sheet(desc):
    sheet_name = os.getenv("GOOGLE_SHEET_NAME")
    sheet = client.open(sheet_name).sheet1

    row = [
        desc.get("title", ""),
        desc.get("description", ""),
        desc.get("category", ""),
        desc.get("color", ""),
        desc.get("region", ""),
        ", ".join(desc.get("tags", [])),
        desc.get("material", ""),
        desc.get("size", ""),
        desc.get("dimensions", ""),
        desc.get("weight", ""),
        desc.get("price", ""),
        desc.get("sku", ""),
        next((", ".join(opt["values"]) for opt in desc.get("options", []) if opt["name"].lower() == "size"), ""),
        next((", ".join(opt["values"]) for opt in desc.get("options", []) if opt["name"].lower() == "color"), ""),
        desc.get("seo", {}).get("page_title", ""),
        desc.get("seo", {}).get("meta_description", ""),
    ]

    sheet.append_row(row)

