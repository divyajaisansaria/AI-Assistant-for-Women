import requests
import re
import time
import csv
from serpapi import GoogleSearch
import pywhatkit
import os

SERP_API_KEY = "b5d04b052a40ce2fbf6c45d8bbc647854dca04b5d22d07380a0bf115ebc40928"
INDIAN_CITIES = [ "Mumbai", "Bangalore"]
CSV_FILENAME = "contacts.csv"

def send_whatsapp_message(phone, name, image_url, message):
    try:
        # Download image
        img_data = requests.get(image_url).content
        with open("temp.jpg", "wb") as handler:
            handler.write(img_data)

        pywhatkit.sendwhats_image(
            receiver=phone,
            img_path="temp.jpg",
            caption=message,
            wait_time=15,
            tab_close=True,
            close_time=3
        )
        print(f"✅ Sent to {name}: {phone}")
        return True
    except Exception as e:
        print(f"❌ Failed for {name}: {e}")
        return False

def append_contacts_to_csv(contacts, filename=CSV_FILENAME):
    if not contacts:
        print("⚠️ No sent contacts to save.")
        return

    file_exists = os.path.isfile(filename)

    with open(filename, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Name", "Phone", "City"])
        if not file_exists:
            writer.writeheader()
        writer.writerows(contacts)

    print(f"\n📁 Appended {len(contacts)} sent contacts to {filename}")

def scrape_and_message(product):
    title = product["title"]
    image_url = product["image_url"]
    color = product.get("color", "N/A")
    material = product.get("material", "N/A")
    size = product.get("size", "N/A")
    price = product.get("price", "N/A")

    message = (
        f"🛍️ *{title}*\n"
        f"🎨 Color: {color}\n"
        f"🧵 Material: {material}\n"
        f"📐 Size: {size}\n"
        f"💰 Price: ₹{price}\n\n"
        f"📦 Available for retail & bulk purchase!"
    )

    sent_count = 0
    seen = set()
    sent_contacts = []

    for city in INDIAN_CITIES:
        print(f"\n🔍 Searching in {city}")
        params = {
            "engine": "google_maps",
            "type": "search",
            "q": f"{title} stores in {city}",
            "api_key": SERP_API_KEY,
        }

        try:
            search = GoogleSearch(params)
            results = search.get_dict().get("local_results", [])
        except Exception as e:
            print(f"❌ Error for {city}: {e}")
            continue

        for store in results:
            name = store.get("title", "")
            phone = store.get("phone", "")

            if not phone or name in seen:
                continue
            seen.add(name)

            phone_clean = "+91" + re.sub(r"\D", "", phone)[-10:]

            if send_whatsapp_message(phone_clean, name, image_url, message):
                sent_contacts.append({"Name": name, "Phone": phone_clean, "City": city})
                sent_count += 1
                if sent_count >= 2:
                    append_contacts_to_csv(sent_contacts)
                    print("✅ Sent to 5 contacts. Done.")
                    return
                time.sleep(15)

        time.sleep(2)  # Avoid SERP API rate limit

    append_contacts_to_csv(sent_contacts)
    print(f"\n⚠️ Sent to only {sent_count} contacts.")

# Example usage:
# scrape_and_message({
#     "title": "NOBERO Men's Classic Black Crew Neck T-Shirt",
#     "image_url": "https://res.cloudinary.com/dpzxcxyqv/image/upload/v1751964569/px44rjm1...",
#     "color": "Black",
#     "material": "Cotton",
#     "size": "L",w

#     "price": "499"
# })
