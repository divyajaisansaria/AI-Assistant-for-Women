import asyncio
import pandas as pd
from tqdm import tqdm
from playwright.async_api import async_playwright

BASE_URL = "https://www.snapdeal.com/search?keyword=rakhi"
KEYWORD = BASE_URL.split("keyword=")[-1].split("&")[0].capitalize()
TARGET_PRODUCT_COUNT = 300  # Adjust as needed

def extract_region_from(text):
    if not text:
        return ""
    known_regions = ['Indore', 'Rajasthan', 'Assam', 'Delhi', 'Kolkata', 'Surat',
                     'Lucknow', 'Tamil Nadu', 'Mumbai', 'Punjab', 'Uttar Pradesh']
    for region in known_regions:
        if region.lower() in text.lower():
            return region
    return ""

async def scroll_and_collect_links(page):
    print("🔍 Scrolling page to collect product links...")
    collected_links = set()
    retries = 0

    await page.goto(BASE_URL, timeout=60000)
    await page.wait_for_selector("div#products div.product-tuple-listing a.dp-widget-link", timeout=20000)

    last_height = await page.evaluate("() => document.body.scrollHeight")

    while len(collected_links) < TARGET_PRODUCT_COUNT and retries < 5:
        await page.mouse.wheel(0, 5000)
        await asyncio.sleep(2)

        product_elements = await page.query_selector_all("div#products div.product-tuple-listing a.dp-widget-link")
        for elem in product_elements:
            href = await elem.get_attribute("href")
            if href and "/product/" in href:
                full_link = href.split("?")[0]
                if not full_link.startswith("http"):
                    full_link = "https://www.snapdeal.com" + full_link
                collected_links.add(full_link)
                if len(collected_links) >= TARGET_PRODUCT_COUNT:
                    break

        new_height = await page.evaluate("() => document.body.scrollHeight")
        if new_height == last_height:
            retries += 1
        else:
            retries = 0
        last_height = new_height

        print(f"🔗 Collected {len(collected_links)} links so far...")

    return list(collected_links)

async def extract_product_data(page, url, retry=2):
    try:
        await page.goto(url, timeout=60000)
        await page.wait_for_selector(".pdp-e-i-head", timeout=15000)

        title = await page.text_content(".pdp-e-i-head")
        price_text = await page.text_content("span.payBlkBig")
        price = float(price_text.replace("Rs.", "").replace(",", "").strip()) if price_text else None

        try:
            desc = await page.text_content(".detailssubbox[itemprop='description']")
            if not desc or desc.strip() == "":
                desc = "No description available."
        except:
            desc = "No description available."

        specs = {}
        type_value = None

        rows = await page.query_selector_all("table.product-spec tr")
        for row in rows:
            key_el = await row.query_selector("td:nth-child(1)")
            val_el = await row.query_selector("td:nth-child(2)")
            if key_el and val_el:
                key = (await key_el.text_content()).strip().lower()
                val = (await val_el.text_content()).strip()
                specs[key] = val

        items = await page.query_selector_all(".spec-body.p-keyfeatures ul.dtls-list li")
        for li in items:
            content = await li.query_selector(".h-content")
            if content:
                text = (await content.text_content()).strip()
                if ":" in text:
                    key, val = text.split(":", 1)
                    key = key.strip().lower()
                    val = val.strip()
                    specs[key] = val
                    if key == "type":
                        type_value = val

        food_preference = specs.get("food preference", "")
        no_onion_garlic = specs.get("no onion no garlic", "")
        shelf_life = specs.get("shelf life(in days)", "") or specs.get("shelf life", "")
        flavour = specs.get("flavour/variant (actual)", "") or specs.get("flavour", "")
        no_of_pieces = specs.get("number of pieces", "") or specs.get("no. of pieces", "")
        region = extract_region_from(
            specs.get("packer's name & address", "") or
            specs.get("manufacturer's name & address", "") or
            specs.get("importer's name & address", "")
        ) or specs.get("country of origin or manufacture or assembly", "") or ""
        speciality = specs.get("speciality", "") or specs.get("feature", "") or specs.get("speciality/feature", "") or specs.get("benefits/features", "")

        return {
    "title": title or "",
    "type": KEYWORD,
    "subtype": specs.get("variant name", "") or specs.get("variant", "") or specs.get("type", "") or KEYWORD,
    "material": specs.get("material", ""),
    "color": specs.get("color", "") or specs.get("colour", ""),
    "packaging_material": specs.get("packaging material", "") or specs.get("packaging type", ""),
    "size": specs.get("size", ""),
    "dimensions": (
        specs.get("length", "") + "x" +
        specs.get("width", "") + "x" +
        specs.get("height", "")
        if specs.get("length", "") or specs.get("width", "") or specs.get("height", "")
        else specs.get("dimension", "") or specs.get("dimension (lxbxh in cm)", "")
    ),
    "weight": specs.get("weight (kg)", "") or specs.get("weight", ""),
    "region": region,
    "packer_name": specs.get("packer's name & address", ""),
    "price": price,
    "description": desc or "",
    "food_preference": food_preference,
    "no_onion_garlic": no_onion_garlic,
    "shelf_life_days": shelf_life,
    "flavour_variant": flavour,
    "no_of_pieces": no_of_pieces,
    "skin_type": specs.get("skin type", ""),
    "application_area": specs.get("application area", ""),
    "purpose": specs.get("purpose", ""),
    "speciality_or_feature": speciality,
    "key_ingredients": specs.get("key ingredients (actual)", "") or specs.get("ingredients", ""),
}


    except Exception as e:
        if retry > 0:
            print(f"⏳ Retrying {url} due to error: {e}")
            await asyncio.sleep(2)
            return await extract_product_data(page, url, retry - 1)
        else:
            print(f"❌ Failed to extract data from: {url}")
            return None

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        product_links = await scroll_and_collect_links(page)
        print(f"\n🔗 Total product links collected: {len(product_links)}\n")

        all_data = []
        for url in tqdm(product_links, desc=f"🥒 Scraping {KEYWORD} Products"):
            data = await extract_product_data(page, url)
            if data:
                all_data.append(data)
            await asyncio.sleep(1.5)

        await browser.close()

        df_new = pd.DataFrame(all_data)

        try:
            df_existing = pd.read_csv("snapdeal_pickle_scrapped_data.csv")
            df_combined = pd.concat([df_existing, df_new], ignore_index=True)
        except FileNotFoundError:
            df_combined = df_new

        df_combined.to_csv("snapdeal_pickle_scrapped_data.csv", index=False)
        print(f"\n📁 Appended {KEYWORD} data to snapdeal_scrapped_data.csv")

if __name__ == "__main__":
    asyncio.run(main())
