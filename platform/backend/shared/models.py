import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, Date, DateTime, Text, BigInteger, ForeignKey
from sqlalchemy.sql import func
from shared.db import Base
from shared.types import GUID, json_type


class User(Base):
    __tablename__ = "users"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="customer")  # admin, analyst, customer
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuthSession(Base):
    __tablename__ = "sessions"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    token_jti = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    stock_qty = Column(Integer, default=0)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    product_id = Column(GUID(), ForeignKey("products.id"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    region = Column(String)
    transaction_date = Column(Date, nullable=False)


class BacktestData(Base):
    __tablename__ = "backtest_data"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    ticker = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Numeric(12, 4))
    high = Column(Numeric(12, 4))
    low = Column(Numeric(12, 4))
    close = Column(Numeric(12, 4))
    adj_close = Column(Numeric(12, 4))
    volume = Column(BigInteger)


class Strategy(Base):
    __tablename__ = "strategies"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(String, default="preset")  # preset or custom
    parameters = Column(json_type(), default={})
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)


class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(GUID(), ForeignKey("strategies.id"))
    ticker = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    split_date = Column(Date)
    status = Column(String, default="running")  # running, completed, failed
    bias_check_passed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BacktestMetrics(Base):
    __tablename__ = "backtest_metrics"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    run_id = Column(GUID(), ForeignKey("backtest_runs.id"))
    cagr = Column(Numeric(8, 4))
    sharpe_ratio = Column(Numeric(8, 4))
    max_drawdown = Column(Numeric(8, 4))
    win_rate = Column(Numeric(8, 4))
    equity_curve = Column(json_type())  # [{date, equity}, ...]


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(GUID(), ForeignKey("assistant_conversations.id"))
    role = Column(String, nullable=False)       # user or assistant
    content = Column(Text, nullable=False)
    intent_type = Column(String)               # product_query, business_data_query, general_support
    feedback = Column(String, nullable=True)   # up, down, or null
    created_at = Column(DateTime(timezone=True), server_default=func.now())
