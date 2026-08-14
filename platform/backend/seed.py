import math
import os
import uuid
from datetime import date

import pandas as pd

from auth.routes import hash_password
from backtesting.strategies import STRATEGIES
from shared.db import Base, SessionLocal, engine
from shared.models import BacktestData, Product, Strategy, Transaction, User


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SEED_DIR = os.path.join(BASE_DIR, "data", "seed")
DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@novaretail.com")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "demo12345")


def _as_uuid(value: str | None) -> uuid.UUID | None:
    if not value or (isinstance(value, float) and math.isnan(value)):
        return None
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None


def seed_users(db):
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user:
        return user
    user = User(email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD), role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_products(db):
    path = os.path.join(SEED_DIR, "products.csv")
    if not os.path.exists(path):
        return 0
    df = pd.read_csv(path)
    count = 0
    for row in df.to_dict(orient="records"):
        product_id = _as_uuid(row.get("id")) or uuid.uuid4()
        existing = db.query(Product).filter(Product.id == product_id).first()
        if existing:
            continue
        db.add(Product(
            id=product_id,
            name=row["name"],
            category=row["category"],
            price=row["price"],
            stock_qty=int(row.get("stock_qty") or 0),
            description=row.get("description", ""),
        ))
        count += 1
    db.commit()
    return count


def seed_transactions(db):
    path = os.path.join(SEED_DIR, "transactions.csv")
    if not os.path.exists(path):
        return 0
    df = pd.read_csv(path)
    count = 0
    for row in df.to_dict(orient="records"):
        tx_id = _as_uuid(row.get("id")) or uuid.uuid4()
        existing = db.query(Transaction).filter(Transaction.id == tx_id).first()
        if existing:
            continue
        product_id = _as_uuid(row.get("product_id"))
        if not product_id or not db.query(Product).filter(Product.id == product_id).first():
            continue
        db.add(Transaction(
            id=tx_id,
            product_id=product_id,
            user_id=None,
            quantity=int(row["quantity"]),
            total_amount=row["total_amount"],
            region=row.get("region"),
            transaction_date=pd.to_datetime(row["transaction_date"]).date(),
        ))
        count += 1
    db.commit()
    return count


def seed_strategies(db, user):
    count = 0
    for strategy_id, meta in STRATEGIES.items():
        existing = db.query(Strategy).filter(Strategy.name == meta["name"], Strategy.type == "preset").first()
        if existing:
            continue
        params = {key: value["default"] for key, value in meta.get("parameters", {}).items()}
        db.add(Strategy(name=meta["name"], type="preset", parameters=params, created_by=user.id))
        count += 1
    db.commit()
    return count


def _generate_ohlcv_csv(ticker: str, start_price: float, drift: float):
    safe_ticker = ticker.replace(".", "_")
    path = os.path.join(SEED_DIR, f"{safe_ticker}_historical.csv")
    if os.path.exists(path):
        return path

    dates = pd.bdate_range("2020-01-01", "2024-12-31")
    rows = []
    price = start_price
    for i, current in enumerate(dates):
        seasonal = math.sin(i / 23) * 0.012
        shock = math.sin(i / 7) * 0.006
        price = max(1.0, price * (1 + drift + seasonal + shock))
        open_price = price * (1 - 0.003)
        close_price = price
        high = max(open_price, close_price) * 1.008
        low = min(open_price, close_price) * 0.992
        volume = int(1_000_000 + (abs(math.sin(i / 13)) * 2_500_000))
        rows.append({
            "Date": current.date().isoformat(),
            "Open": round(open_price, 4),
            "High": round(high, 4),
            "Low": round(low, 4),
            "Close": round(close_price, 4),
            "Adj Close": round(close_price, 4),
            "Volume": volume,
        })

    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def seed_backtest_data(db):
    specs = {
        "AAPL": (120.0, 0.00025),
        "TSLA": (210.0, 0.00015),
        "INFY.NS": (1450.0, 0.00018),
    }
    count = 0
    for ticker, (start_price, drift) in specs.items():
        path = _generate_ohlcv_csv(ticker, start_price, drift)
        df = pd.read_csv(path, parse_dates=["Date"])
        for row in df.to_dict(orient="records"):
            row_date = row["Date"].date() if hasattr(row["Date"], "date") else pd.to_datetime(row["Date"]).date()
            existing = db.query(BacktestData).filter(BacktestData.ticker == ticker, BacktestData.date == row_date).first()
            if existing:
                continue
            db.add(BacktestData(
                ticker=ticker,
                date=row_date,
                open=row["Open"],
                high=row["High"],
                low=row["Low"],
                close=row["Close"],
                adj_close=row["Adj Close"],
                volume=int(row["Volume"]),
            ))
            count += 1
    db.commit()
    return count


def main():
    os.makedirs(SEED_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = seed_users(db)
        summary = {
            "demo_user": user.email,
            "products": seed_products(db),
            "transactions": seed_transactions(db),
            "strategies": seed_strategies(db, user),
            "backtest_prices": seed_backtest_data(db),
        }
        print(summary)
    finally:
        db.close()


if __name__ == "__main__":
    main()
