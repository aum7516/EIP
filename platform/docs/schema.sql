-- ============================================================
-- Orbit EIP — PostgreSQL Schema Migration
-- Run this in Supabase SQL Editor (or psql) to set up all tables
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT DEFAULT 'customer',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  stock_qty   INTEGER DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID REFERENCES products(id),
  user_id          UUID REFERENCES users(id),
  quantity         INTEGER NOT NULL,
  total_amount     NUMERIC(10,2) NOT NULL,
  region           TEXT,
  transaction_date DATE NOT NULL
);

-- 4. Backtest OHLCV data
CREATE TABLE IF NOT EXISTS backtest_data (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker    TEXT NOT NULL,
  date      DATE NOT NULL,
  open      NUMERIC(12,4),
  high      NUMERIC(12,4),
  low       NUMERIC(12,4),
  close     NUMERIC(12,4),
  adj_close NUMERIC(12,4),
  volume    BIGINT,
  UNIQUE(ticker, date)
);
CREATE INDEX IF NOT EXISTS idx_backtest_ticker_date ON backtest_data(ticker, date);

-- 5. Strategies
CREATE TABLE IF NOT EXISTS strategies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT DEFAULT 'preset',
  parameters JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id)
);

-- 6. Backtest runs
CREATE TABLE IF NOT EXISTS backtest_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id       UUID REFERENCES strategies(id),
  ticker            TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  split_date        DATE,
  status            TEXT DEFAULT 'running',
  bias_check_passed BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Backtest metrics
CREATE TABLE IF NOT EXISTS backtest_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID REFERENCES backtest_runs(id),
  cagr         NUMERIC(8,4),
  sharpe_ratio NUMERIC(8,4),
  max_drawdown NUMERIC(8,4),
  win_rate     NUMERIC(8,4),
  equity_curve JSONB
);

-- 8. Assistant conversations
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Assistant messages
CREATE TABLE IF NOT EXISTS assistant_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES assistant_conversations(id),
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  intent_type     TEXT,
  feedback        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_region   ON transactions(region);
CREATE INDEX IF NOT EXISTS idx_transactions_product  ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON assistant_messages(conversation_id);

