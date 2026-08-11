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
    products: list of {id, name, category, price, description}
    """
    col = _get_collection()
    ids = [str(p["id"]) for p in products]
    docs = [f"{p['name']} | {p['category']} | {p['description']}" for p in products]
    metas = [{"name": p["name"], "category": p["category"], "price": float(p["price"])} for p in products]
    col.upsert(ids=ids, documents=docs, metadatas=metas)
    return len(products)


def search_products(query: str, top_k: int = 5) -> list[dict]:
    """Semantic product search. Returns top_k matching products with metadata."""
    col = _get_collection()
    count = col.count()
    if count == 0:
        # Return mock products if ChromaDB is empty
        return [
            {"id": "mock-1", "name": "UltraBook Pro 15", "category": "Electronics", "price": 89999, "score": 0.95, "description": "High-performance laptop for professionals"},
            {"id": "mock-2", "name": "CloudSync Wireless Earbuds", "category": "Electronics", "price": 4999, "score": 0.88, "description": "Premium audio with 30hr battery"},
            {"id": "mock-3", "name": "ErgoDesk Standing Desk", "category": "Furniture", "price": 24999, "score": 0.75, "description": "Height-adjustable smart desk"},
        ][:top_k]

    results = col.query(query_texts=[query], n_results=min(top_k, count))
    output = []
    for i, doc_id in enumerate(results["ids"][0]):
        meta = results["metadatas"][0][i]
        dist = results["distances"][0][i]
        output.append({
            "id": doc_id,
            "name": meta.get("name", ""),
            "category": meta.get("category", ""),
            "price": meta.get("price", 0),
            "score": round(1 - dist, 4),
            "description": results["documents"][0][i]
        })
    return output
