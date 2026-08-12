import os
import random
import pandas as pd
from datetime import datetime, timedelta

# Set random seed for reproducible demo data
random.seed(42)

start_date = datetime(2026, 2, 1)
end_date = datetime(2026, 7, 31)
date_span = (end_date - start_date).days

products_catalog = [
    # Electronics
    {"product": "Laptop Pro 15", "category": "Electronics", "unit_price": 68000, "cost_pct": 0.78},
    {"product": "Smartphone X", "category": "Electronics", "unit_price": 42000, "cost_pct": 0.72},
    {"product": "Monitor 27 Ultra", "category": "Electronics", "unit_price": 24000, "cost_pct": 0.70},
    {"product": "Tablet Pro 11", "category": "Electronics", "unit_price": 38000, "cost_pct": 0.75},
    {"product": "Wireless Earbuds", "category": "Electronics", "unit_price": 4500, "cost_pct": 0.60},
    {"product": "Smart Watch Series 7", "category": "Electronics", "unit_price": 18500, "cost_pct": 0.68},
    {"product": "Mechanical RGB Keyboard", "category": "Electronics", "unit_price": 6200, "cost_pct": 0.58},
    {"product": "Gaming Mouse 8K", "category": "Electronics", "unit_price": 3200, "cost_pct": 0.55},
    {"product": "Noise Cancelling Headphones", "category": "Electronics", "unit_price": 14500, "cost_pct": 0.65},
    {"product": "4K Streaming WebCam", "category": "Electronics", "unit_price": 7800, "cost_pct": 0.62},
    {"product": "Portable SSD 2TB", "category": "Electronics", "unit_price": 12500, "cost_pct": 0.70},
    
    # Furniture
    {"product": "Ergonomic Office Chair", "category": "Furniture", "unit_price": 14500, "cost_pct": 0.62},
    {"product": "Executive Desk", "category": "Furniture", "unit_price": 28000, "cost_pct": 0.65},
    {"product": "Standing Desk Dual Engine", "category": "Furniture", "unit_price": 34000, "cost_pct": 0.68},
    {"product": "Bookshelf Wooden", "category": "Furniture", "unit_price": 8900, "cost_pct": 0.58},
    {"product": "Monitor Arm Dual Mount", "category": "Furniture", "unit_price": 4200, "cost_pct": 0.50},
    {"product": "Mesh Task Chair", "category": "Furniture", "unit_price": 7500, "cost_pct": 0.60},

    # Clothing
    {"product": "Running Jacket Pro", "category": "Clothing", "unit_price": 4800, "cost_pct": 0.45},
    {"product": "Denim Pants Premium", "category": "Clothing", "unit_price": 2900, "cost_pct": 0.42},
    {"product": "Cotton Polo Shirt", "category": "Clothing", "unit_price": 1600, "cost_pct": 0.40},
    {"product": "Windbreaker Hooded", "category": "Clothing", "unit_price": 3800, "cost_pct": 0.46},
    {"product": "Formal Suit Blazer", "category": "Clothing", "unit_price": 11500, "cost_pct": 0.55},

    # Home Appliances
    {"product": "Coffee Maker Deluxe", "category": "Home Appliances", "unit_price": 12800, "cost_pct": 0.64},
    {"product": "Air Purifier Pro", "category": "Home Appliances", "unit_price": 16500, "cost_pct": 0.66},
    {"product": "Robotic Vacuum X", "category": "Home Appliances", "unit_price": 26000, "cost_pct": 0.70},
    {"product": "Electric Kettle Stainless", "category": "Home Appliances", "unit_price": 2400, "cost_pct": 0.52},
    {"product": "Smart Blender 1200W", "category": "Home Appliances", "unit_price": 6800, "cost_pct": 0.58},

    # Footwear
    {"product": "Pro Runner Shoes", "category": "Footwear", "unit_price": 6500, "cost_pct": 0.48},
    {"product": "Casual Leather Loafers", "category": "Footwear", "unit_price": 4200, "cost_pct": 0.50},
    {"product": "Trail Hiking Boots", "category": "Footwear", "unit_price": 8400, "cost_pct": 0.52},

    # Accessories
    {"product": "Travel Backpack 30L", "category": "Accessories", "unit_price": 3500, "cost_pct": 0.45},
    {"product": "Leather Slim Wallet", "category": "Accessories", "unit_price": 1400, "cost_pct": 0.38},
    {"product": "Laptop Sleeve 15", "category": "Accessories", "unit_price": 1100, "cost_pct": 0.35},
    {"product": "MagSafe Power Bank", "category": "Accessories", "unit_price": 3200, "cost_pct": 0.52}
]

regions = ["North", "South", "East", "West", "Central"]
customer_types = ["New", "Returning"]
payment_methods = ["UPI", "Card", "Cash", "Net Banking"]
salespeople = ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Neha Singh", "Vikas Verma", "Ananya Roy", "Siddharth Rao", "Kavita Reddy"]

num_rows = 6500
records = []

for i in range(1, num_rows + 1):
    tx_id = f"TX{i:05d}"
    days_offset = random.randint(0, date_span)
    tx_date = (start_date + timedelta(days=days_offset)).strftime("%Y-%m-%d")
    
    prod_info = random.choice(products_catalog)
    product = prod_info["product"]
    category = prod_info["category"]
    unit_price = prod_info["unit_price"]
    
    region = random.choices(regions, weights=[0.25, 0.22, 0.18, 0.23, 0.12])[0]
    cust_type = random.choices(customer_types, weights=[0.42, 0.58])[0]
    
    # Quantity logic: Returning customers order slightly more quantity
    if cust_type == "Returning":
        quantity = random.randint(1, 8)
    else:
        quantity = random.randint(1, 4)
        
    # Anomaly injection: West region in May 2026 had massive discounts (up to 30%)
    if region == "West" and "2026-05" in tx_date and category == "Electronics":
        discount = random.randint(18, 32)
    else:
        discount = random.choices([0, 5, 8, 10, 12, 15, 20], weights=[0.35, 0.25, 0.15, 0.12, 0.08, 0.03, 0.02])[0]
        
    revenue = round(quantity * unit_price * (1.0 - discount / 100.0), 2)
    cost = round(quantity * unit_price * prod_info["cost_pct"], 2)
    profit = round(revenue - cost, 2)
    
    pay_method = random.choices(payment_methods, weights=[0.45, 0.35, 0.10, 0.10])[0]
    salesperson = random.choice(salespeople)
    
    records.append({
        "transaction_id": tx_id,
        "date": tx_date,
        "product": product,
        "category": category,
        "region": region,
        "customer_type": cust_type,
        "quantity": quantity,
        "unit_price": unit_price,
        "discount": discount,
        "revenue": revenue,
        "cost": cost,
        "profit": profit,
        "payment_method": pay_method,
        "salesperson": salesperson
    })

# Add small controlled quality defects for testing the Data Validation module
# 1. 13 missing values in discount
for idx in [45, 128, 342, 891, 1205, 1822, 2301, 2940, 3411, 4102, 4820, 5304, 6112]:
    if idx < len(records):
        records[idx]["discount"] = ""

# 2. 7 duplicate transaction IDs
for idx, dup_id in enumerate(["TX00012", "TX00145", "TX00892", "TX01420", "TX02890", "TX03510", "TX05200"]):
    if idx + 500 < len(records):
        records[idx + 500]["transaction_id"] = dup_id

df = pd.DataFrame(records)
out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
csv_path = os.path.join(out_dir, "transactions.csv")
df.to_csv(csv_path, index=False)

print(f"Successfully generated {len(df)} transactions in {csv_path}")
