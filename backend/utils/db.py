from pymongo import MongoClient
import os

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["your_database"]
collection = db["products"]

def save_product_to_db(data):
    collection.insert_one(data)

def get_all_products():
    # Exclude `_id` so frontend doesn't need to handle ObjectId
    return list(collection.find({}, {"_id": 0}))
