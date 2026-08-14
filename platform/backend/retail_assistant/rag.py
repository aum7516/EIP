"""
RAG pipeline for the Retail Assistant using ChromaDB.
Embeds product catalog once; retrieves relevant products at query time.
"""
import os
import json
import chromadb
from chromadb.utils import embedding_functions

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma_db")
COLLECTION_NAME = "eip_products"

_client = None
_collection = None

# Rich fallback catalog used when ChromaDB is empty (30 Indian retail products)
MOCK_CATALOG = [
    {"id": "m01", "name": "UltraBook Pro 15 (2024)", "category": "Electronics", "price": 89999, "stock_qty": 45, "description": "Intel i9 15th Gen, 32GB RAM, 1TB SSD, OLED display. Ideal for professionals and power users."},
    {"id": "m02", "name": "CloudSync Wireless Earbuds X1", "category": "Electronics", "price": 4999, "stock_qty": 200, "description": "Active noise cancellation, 36hr battery, IPX5 waterproof. Crystal-clear audio for calls and music."},
    {"id": "m03", "name": "ErgoDesk Smart Standing Desk", "category": "Furniture", "price": 24999, "stock_qty": 20, "description": "Electric height-adjustment, 4 memory presets, 80kg load capacity. Improve posture and productivity."},
    {"id": "m04", "name": "Galaxy Tab Ultra 12.4\"", "category": "Electronics", "price": 54999, "stock_qty": 60, "description": "2K AMOLED, 12GB RAM, S-Pen included. Perfect for artists and content creators."},
    {"id": "m05", "name": "MechPro RGB Keyboard", "category": "Accessories", "price": 7999, "stock_qty": 120, "description": "Cherry MX Brown switches, per-key RGB, aluminum frame, USB-C. Tactile typing experience."},
    {"id": "m06", "name": "ProView 27\" 4K Monitor", "category": "Electronics", "price": 34999, "stock_qty": 35, "description": "4K IPS, 144Hz, HDR400, USB-C 90W charging. Color-accurate display for professionals."},
    {"id": "m07", "name": "AirChair Ergonomic Office Chair", "category": "Furniture", "price": 18999, "stock_qty": 30, "description": "Lumbar support, 4D armrests, breathable mesh back, tilt lock. 8-hour comfort guarantee."},
    {"id": "m08", "name": "SnapShot DSLR D7500 Kit", "category": "Electronics", "price": 74999, "stock_qty": 15, "description": "24MP APS-C sensor, 4K video, 18-55mm kit lens included. Great for photography beginners and enthusiasts."},
    {"id": "m09", "name": "PowerStation 20000mAh", "category": "Accessories", "price": 2499, "stock_qty": 350, "description": "65W PD fast charge, dual USB-A, USB-C, LCD display. Charge laptops and phones on the go."},
    {"id": "m10", "name": "SmartHome Hub Pro", "category": "Electronics", "price": 5999, "stock_qty": 80, "description": "Works with Alexa, Google, Apple HomeKit. Control 100+ smart devices from one hub."},
    {"id": "m11", "name": "CoolerPad Pro RGB (15.6\")", "category": "Accessories", "price": 1999, "stock_qty": 150, "description": "5 fans, RGB lighting, adjustable stand, USB hub. Keeps gaming laptops cool under heavy load."},
    {"id": "m12", "name": "WebCam 4K Ultra HD", "category": "Accessories", "price": 8499, "stock_qty": 90, "description": "4K 30fps, auto-focus, built-in mic with noise cancellation. Perfect for video calls and streaming."},
    {"id": "m13", "name": "PixelPad Pro Drawing Tablet", "category": "Accessories", "price": 12999, "stock_qty": 40, "description": "8192 pressure levels, tilt recognition, battery-free stylus. Designed for digital artists."},
    {"id": "m14", "name": "NoisePro Studio Headphones", "category": "Electronics", "price": 14999, "stock_qty": 70, "description": "40mm drivers, hybrid ANC, 30hr battery, foldable design. Professional studio-quality sound."},
    {"id": "m15", "name": "FitBand Ultra Watch", "category": "Electronics", "price": 9999, "stock_qty": 180, "description": "AMOLED display, SpO2 & ECG sensors, GPS, 7-day battery. Your health companion."},
    {"id": "m16", "name": "BudgetBook 14\" Laptop", "category": "Electronics", "price": 32999, "stock_qty": 55, "description": "AMD Ryzen 5, 8GB RAM, 512GB SSD, Full HD IPS. Reliable everyday laptop under ₹35,000."},
    {"id": "m17", "name": "IceBreeze Tower Fan 52\"", "category": "Appliances", "price": 6499, "stock_qty": 45, "description": "Remote control, 12 speed settings, 8hr timer, whisper-quiet motor. Stay cool this summer."},
    {"id": "m18", "name": "BrewMaster Coffee Machine", "category": "Appliances", "price": 15999, "stock_qty": 25, "description": "15-bar espresso, cappuccino & latte modes, 1.5L tank, milk frother. Barista at home."},
    {"id": "m19", "name": "OptiMount Monitor Arm", "category": "Accessories", "price": 3499, "stock_qty": 100, "description": "Full motion, holds up to 27\", cable management, C-clamp + grommet mount. Clean desk setup."},
    {"id": "m20", "name": "SpeedLink USB-C Hub 10-in-1", "category": "Accessories", "price": 2999, "stock_qty": 200, "description": "4K HDMI, SD/TF card, 100W PD, Ethernet, 3x USB-A. Ultimate laptop docking solution."},
    {"id": "m21", "name": "PhotoFrame Digital 10\"", "category": "Electronics", "price": 7999, "stock_qty": 60, "description": "1920x1200 IPS, WiFi, 16GB storage, touch-enabled. Display rotating photos automatically."},
    {"id": "m22", "name": "GamePad Pro X Controller", "category": "Accessories", "price": 4499, "stock_qty": 130, "description": "Hall effect joysticks, 40hr battery, Bluetooth 5.2, turbo + remap buttons. Works on PC & mobile."},
    {"id": "m23", "name": "SoundBar Q80 120W", "category": "Electronics", "price": 19999, "stock_qty": 30, "description": "Dolby Atmos, 2.1ch, HDMI ARC, Bluetooth. Theater-quality sound for your TV."},
    {"id": "m24", "name": "SecureKey Fingerprint Lock", "category": "Accessories", "price": 3999, "stock_qty": 75, "description": "Stores 100 fingerprints, USB backup key, anti-pry alarm. Smart home security made easy."},
    {"id": "m25", "name": "WirelesRouter Mesh Pro 6E", "category": "Electronics", "price": 17999, "stock_qty": 40, "description": "WiFi 6E, tri-band, covers 3000 sq ft, parental controls, VPN server. Blazing-fast home WiFi."},
    {"id": "m26", "name": "LumiDesk Lamp LED 24W", "category": "Accessories", "price": 2499, "stock_qty": 220, "description": "5 color temps, 10 brightness levels, wireless Qi charger base, USB-A port. Perfect desk companion."},
    {"id": "m27", "name": "AirPure HEPA Purifier 500", "category": "Appliances", "price": 12999, "stock_qty": 35, "description": "True HEPA + activated carbon, covers 400 sq ft, PM2.5 sensor, auto mode. Clean air guaranteed."},
    {"id": "m28", "name": "ZenChair Gaming Chair Pro", "category": "Furniture", "price": 21999, "stock_qty": 20, "description": "4D armrests, reclining to 165°, lumbar pillow, neck pillow, cold foam padding. Game in comfort."},
    {"id": "m29", "name": "SlimCase Laptop Bag 15.6\"", "category": "Accessories", "price": 1799, "stock_qty": 300, "description": "Waterproof nylon, TSA-friendly, 5 compartments, USB charging port. Travel in style."},
    {"id": "m30", "name": "ProMic USB Condenser", "category": "Accessories", "price": 6999, "stock_qty": 85, "description": "Cardioid pattern, 192kHz/24-bit, built-in headphone monitoring, mute button. Studio voice for podcasts."},
]


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
        ef = embedding_functions.DefaultEmbeddingFunction()
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def embed_products(products: list[dict]):
    """
    One-time embedding of all products into ChromaDB.
    Call this during seeding or first startup.
    products: list of {id, name, category, price, stock_qty, description}
    """
    col = _get_collection()
    ids = [str(p["id"]) for p in products]
    docs = [f"{p['name']} | {p['category']} | {p.get('description', '')}" for p in products]
    metas = [{
        "name": p["name"],
        "category": p["category"],
        "price": float(p["price"]),
        "stock_qty": int(p.get("stock_qty", 0)),
    } for p in products]
    col.upsert(ids=ids, documents=docs, metadatas=metas)
    return len(products)


def search_products(query: str, top_k: int = 5, category: str = None) -> list[dict]:
    """Semantic product search. Returns top_k matching products with metadata."""
    try:
        col = _get_collection()
        count = col.count()
    except Exception:
        count = 0

    if count == 0:
        # Filter mock catalog
        catalog = MOCK_CATALOG
        if category:
            catalog = [p for p in catalog if p["category"].lower() == category.lower()]
        # Simple keyword score on mock data
        query_lower = query.lower()
        scored = []
        for p in catalog:
            score = 0
            text = f"{p['name']} {p['category']} {p['description']}".lower()
            for word in query_lower.split():
                if word in text:
                    score += 1
            scored.append({**p, "score": round(min(score / max(len(query_lower.split()), 1), 1.0), 2)})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    where = {"category": category} if category else None
    kwargs = dict(query_texts=[query], n_results=min(top_k, count))
    if where:
        kwargs["where"] = where
    results = col.query(**kwargs)
    output = []
    for i, doc_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i]
        dist = results["distances"][0][i]
        output.append({
            "id": doc_id,
            "name": meta.get("name", ""),
            "category": meta.get("category", ""),
            "price": meta.get("price", 0),
            "stock_qty": meta.get("stock_qty", 0),
            "score": round(1 - dist, 4),
            "description": results["documents"][0][i].split(" | ")[-1] if " | " in results["documents"][0][i] else results["documents"][0][i]
        })
    return output


def get_all_products(category: str = None, limit: int = 30) -> list[dict]:
    """Return full product catalog, optionally filtered by category."""
    try:
        col = _get_collection()
        count = col.count()
    except Exception:
        count = 0

    if count == 0:
        catalog = MOCK_CATALOG
        if category:
            catalog = [p for p in catalog if p["category"].lower() == category.lower()]
        return catalog[:limit]

    where = {"category": category} if category else None
    kwargs = dict(limit=limit, include=["metadatas", "documents"])
    if where:
        kwargs["where"] = where
    results = col.get(**kwargs)
    output = []
    for i, doc_id in enumerate(results["ids"]):
        meta = results["metadatas"][i]
        doc = results["documents"][i] if results.get("documents") else ""
        output.append({
            "id": doc_id,
            "name": meta.get("name", ""),
            "category": meta.get("category", ""),
            "price": meta.get("price", 0),
            "stock_qty": meta.get("stock_qty", 0),
            "score": 1.0,
            "description": doc.split(" | ")[-1] if " | " in doc else doc
        })
    return output


def get_categories() -> list[str]:
    """Return distinct product categories."""
    try:
        col = _get_collection()
        count = col.count()
    except Exception:
        count = 0

    if count == 0:
        return sorted(set(p["category"] for p in MOCK_CATALOG))

    results = col.get(include=["metadatas"])
    cats = set()
    for m in results.get("metadatas", []):
        if m.get("category"):
            cats.add(m["category"])
    return sorted(cats)

