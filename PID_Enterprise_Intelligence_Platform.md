# Project Implementation Document (PID)
## Orbit — Unified Enterprise Intelligence Platform
**Hackathon:** HACKORBIT (GDG) — PS-05
**Domain:** AI + Data Engineering + Full Stack
**Document purpose:** This PID is written to be handed directly to an AI coding agent (e.g. Antigravity, Claude Code, Cursor) as the single source of truth for building the platform. It defines scope, architecture, data contracts, module specs, and build order so the agent can generate consistent code across sessions.

---

## 1. Project Overview

### 1.1 Problem Statement
Build a single, unified web platform — not three disconnected apps — that demonstrates three enterprise capabilities on top of one shared data and AI layer:

1. **Backtesting Module** — evaluates trading strategies while preventing look-ahead bias and presenting trustworthy performance metrics.
2. **DataMart Analytics Module** — ingests transactional datasets and supports fast filtering, aggregation, KPI dashboards, and business insights.
3. **Retail AI Assistant** — answers customer queries, recommends products, assists shopping workflows, and uses structured business data to generate contextual responses.

### 1.2 Core Design Principle
All three modules must read from and write to **one shared data and AI layer**. The differentiator judged in this hackathon is integration, not three isolated features. Concretely:
- One login/auth session works across all modules.
- One database schema serves all modules (no per-module silo databases).
- The DataMart's natural-language query function and the Retail Assistant's business-data lookups call the **same backend function**.
- Backtest results surface as KPIs inside DataMart.

### 1.3 Product Narrative (use consistently across UI copy, demo script, and README)
The platform belongs to a fictional company, **"NovaRetail Inc."**, which:
- Invests its treasury → uses the **Backtesting** module.
- Runs its retail operations → uses the **DataMart Analytics** module.
- Serves its customers → uses the **Retail AI Assistant** module.

One company, one dataset story, one platform — this framing should be reflected in seed data naming and demo narration.

### 1.4 Product Name
**Orbit** — tagline: *"One core. Every business function."*

---

## 2. Objectives & Success Criteria

| Objective | Success Criteria |
|---|---|
| Working end-to-end platform | All 3 modules functional behind one login, deployed to a public URL |
| No look-ahead bias in backtesting | Strategy logic provably cannot access future rows; visible bias-check confirmation in UI |
| Fast DataMart analytics | Filter/aggregation queries return in <1s on the seed dataset |
| Grounded AI assistant | Assistant answers use RAG + live SQL against real data, not hallucinated text |
| Demonstrable integration | At least one clear cross-module data flow visible in the demo (e.g. NL query and assistant hitting the same backend function) |
| Judging alignment | Explicit coverage of: system architecture, correctness, AI integration, usability, scalability, code quality |

---

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (React) + Tailwind CSS + shadcn/ui | Single design system reused across all 3 modules |
| Backend | FastAPI (Python) | One language for backend + data science/ML code |
| Primary database | PostgreSQL (or Supabase-hosted Postgres) | Relational; source of truth for all shared entities |
| Fast analytics engine | DuckDB (embedded, queries Postgres exports/Parquet) | Sub-second OLAP-style aggregation without a separate server |
| Vector store | ChromaDB | RAG over product catalog for Retail Assistant |
| LLM provider | Claude API (function-calling / tool-use enabled) | Powers NL-to-SQL in DataMart and the Retail Assistant |
| Auth | Supabase Auth or custom JWT middleware in FastAPI | One token, shared across all module routers |
| Hosting | Vercel (frontend) + Railway or Render (backend) | Free-tier friendly, fast to deploy |
| Charting | Recharts | Equity curves, KPI charts |
| Backtesting engine (optional wrapper) | `backtrader` or `zipline-reloaded`, or custom pandas-based loop | Custom loop gives more control over the bias-guard for a hackathon demo |

---

## 4. Repository Structure

```
/platform
  /frontend                     (Next.js app)
    /app
      /dashboard                 <- unified home
      /backtesting
      /datamart
      /assistant
    /components                  <- shared UI components (shadcn/ui based)
    /lib                         <- shared API client, auth helpers
  /backend
    /auth                        <- login, JWT issuance, session middleware
    /shared
      /models.py                 <- SQLAlchemy models (single schema, see Section 5)
      /db.py                     <- DB connection/session
      /llm_client.py             <- shared Claude API wrapper (function-calling)
      /query_engine.py           <- shared NL-to-SQL function (used by DataMart AND Assistant)
    /backtesting
      /engine.py                 <- simulation loop + bias guard
      /strategies.py              <- strategy presets
      /routes.py
    /datamart
      /ingestion.py
      /aggregation.py             <- DuckDB query builder
      /routes.py
    /retail_assistant
      /rag.py                     <- ChromaDB retrieval
      /router.py                  <- intent classification
      /routes.py
    /main.py                     <- mounts all routers under one auth-protected app
  /data
    /seed
      /transactions.csv
      /products.csv
      /AAPL_historical.csv        <- example OHLCV file (or NovaRetail's own ticker)
  /docs
    architecture-diagram.png
    demo-script.md
  README.md
```

**Rule for the coding agent:** Always generate new module code against the shared schema and shared query engine defined below — never create a parallel/duplicate data model per module.

---

## 5. Shared Data Schema

All tables live in one Postgres database. This schema is the contract every module must respect.

### 5.1 `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | text, unique | |
| password_hash | text | |
| role | text | e.g. `admin`, `analyst`, `customer` |
| created_at | timestamp | |

### 5.2 `products`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | text | |
| category | text | |
| price | numeric | |
| stock_qty | integer | |
| description | text | embedded into ChromaDB for RAG |
| created_at | timestamp | |

### 5.3 `transactions`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| product_id | UUID (FK -> products.id) | |
| user_id | UUID (FK -> users.id, nullable) | |
| quantity | integer | |
| total_amount | numeric | |
| region | text | |
| transaction_date | date | powers DataMart KPIs and trend queries |

### 5.4 `backtest_data` (OHLCV price history)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| ticker | text | |
| date | date | must be sorted ascending on ingestion |
| open | numeric | |
| high | numeric | |
| low | numeric | |
| close | numeric | |
| adj_close | numeric | |
| volume | bigint | |

### 5.5 `strategies`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | text | e.g. "SMA Crossover" |
| type | text | preset or custom |
| parameters | jsonb | strategy config |
| created_by | UUID (FK -> users.id) | |

### 5.6 `backtest_runs`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| strategy_id | UUID (FK -> strategies.id) | |
| ticker | text | |
| start_date | date | |
| end_date | date | |
| split_date | date | train/test boundary — enforced in engine |
| status | text | `running`, `completed`, `failed` |
| bias_check_passed | boolean | set by the engine, surfaced in UI |
| created_at | timestamp | |

### 5.7 `backtest_metrics`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| run_id | UUID (FK -> backtest_runs.id) | |
| cagr | numeric | |
| sharpe_ratio | numeric | |
| max_drawdown | numeric | |
| win_rate | numeric | |
| equity_curve | jsonb | array of {date, equity} points for charting |

### 5.8 `assistant_conversations` and `assistant_messages`
| Table | Key columns |
|---|---|
| `assistant_conversations` | id, user_id, created_at |
| `assistant_messages` | id, conversation_id (FK), role (`user`/`assistant`), content, intent_type, feedback (`up`/`down`/null), created_at |

---

## 6. Shared Backend Services (build these before any module)

### 6.1 Auth Middleware
- Single `POST /auth/login` and `POST /auth/signup` endpoint.
- Issues JWT; all module routes require this token via a shared FastAPI dependency (`get_current_user`).

### 6.2 Shared Query Engine (`shared/query_engine.py`)
This is the most important shared component — **both DataMart's "ask a question" feature and the Retail Assistant's business-data lookups call this same function.**

**Function contract:**
```python
def ask_business_data(question: str, user_id: str) -> dict:
    """
    1. Sends `question` + schema description to the LLM with function-calling enabled.
    2. LLM returns a structured, parameterized query request (never raw SQL string from LLM directly —
       validate against an allow-list of tables/columns before execution).
    3. Executes the validated query via DuckDB against the transactions/products/backtest tables.
    4. Returns { answer_text, chart_data, raw_rows }.
    """
```
**Security constraint for the agent to enforce:** never pass LLM-generated SQL directly to the database without validating it against an allow-listed schema (table/column names, no DDL, no write statements). This is a required safeguard, not optional polish.

### 6.3 Shared LLM Client (`shared/llm_client.py`)
- Wraps the Claude API with function-calling/tool-use configured for two tools: `query_business_data` and `search_product_catalog`.
- Both the DataMart module and the Retail Assistant module import this client rather than instantiating their own.

---

## 7. Module Specifications

### 7.1 Backtesting Module

**Data selection step (see also Section 8 for CSV format):**
- Accepts preloaded datasets, live API pull (`yfinance`), or CSV upload.
- On ingestion: validate schema, check chronological order, detect gaps, tag point-in-time.

**Strategy definition:**
- Ship 2 presets minimum: SMA crossover, RSI mean-reversion.
- Support custom parameter overrides via form (e.g. window lengths).

**Bias-guard engine (`backtesting/engine.py`):**
- Hard requirement: the simulation loop must slice the dataframe at each simulated timestep — `df[df.index <= current_date]` — and pass only that slice to the strategy function. The strategy object must never hold a reference to the full future-inclusive dataframe.
- Log `bias_check_passed = True` only if this slicing guard was active for the entire run.

**Metrics computed:** CAGR, Sharpe ratio, max drawdown, win rate, full equity curve (for charting).

**Endpoints:**
- `POST /backtest/run` — body: `{ ticker, strategy_id, start_date, end_date, split_date }`
- `GET /backtest/results/{run_id}`
- `GET /backtest/history` — list past runs for comparison

**UI flow:** Select data → Define strategy → Set split/window → Run (async, show loading state) → Results dashboard (equity curve + metrics + bias-check badge) → Save/Compare.

---

### 7.2 DataMart Analytics Module

**Ingestion:**
- Accepts CSV upload or uses seeded `transactions`/`products` tables.
- Auto-profiles columns on ingestion (detect date, category, numeric columns).

**Auto KPI dashboard:** on ingestion, auto-generate default cards: total revenue, order count, top category, revenue trend over time.

**Filtering/aggregation:** implemented via DuckDB queries against Postgres exports or Parquet snapshots of `transactions`. Target: <1s response for filter/drill-down actions.

**Custom view builder:** metric + dimension picker UI that dynamically constructs a DuckDB query.

**Natural-language query (`GET/POST /datamart/ask`):** calls `shared/query_engine.ask_business_data()` directly — do not reimplement this logic inside the DataMart module.

**Endpoints:**
- `POST /datamart/ingest`
- `GET /datamart/kpis`
- `POST /datamart/filter`
- `POST /datamart/ask` — `{ question: str }`

**UI flow:** Ingest dataset → Auto KPI dashboard → Filter/drill down → Build custom view → Ask in natural language → Export/pin.

---

### 7.3 Retail AI Assistant Module

**Embedding pipeline:** one-time script embeds `products.description` (+ name/category) into ChromaDB.

**Intent router (`retail_assistant/router.py`):** lightweight LLM classification step producing one of: `product_query`, `business_data_query`, `general_support`.

**Routing logic:**
- `product_query` → ChromaDB retrieval (RAG) → LLM generates recommendation with product cards.
- `business_data_query` → calls `shared/query_engine.ask_business_data()` — **the same function DataMart uses.** This is the required cross-module proof point.
- `general_support` → standard LLM response, optionally with an escalate-to-human action.

**Conversational memory:** store last N turns per `assistant_conversations` row for follow-up questions (e.g. "show cheaper options").

**Feedback logging:** thumbs up/down on `assistant_messages.feedback`, optionally surfaced back in DataMart as a "customer satisfaction" KPI.

**Endpoints:**
- `POST /assistant/chat` — `{ conversation_id, message }`
- `POST /assistant/feedback` — `{ message_id, feedback }`

**UI flow:** Open chat (available platform-wide) → User asks question → Intent routing → Retrieve context (RAG + live SQL) → Generate grounded response → Take action (add to cart/follow-up/escalate) → Log feedback.

---

## 8. CSV Format Reference (Backtesting Data)

Required columns, chronologically ascending:

```
Date,Open,High,Low,Close,Adj Close,Volume
2024-01-15,182.45,184.20,181.90,183.75,183.75,5230000
2024-01-16,183.80,185.10,182.60,184.90,184.90,4870000
```

- `Date`: YYYY-MM-DD, ascending order (reversed files are the #1 cause of silent look-ahead bugs).
- `Open, High, Low, Close, Adj Close`: float.
- `Volume`: integer.
- One file = one instrument.

**Sourcing options for seed/demo data:**
- Manual: Yahoo Finance → ticker → "Historical Data" tab → Download.
- Programmatic: `yfinance` Python library (`yf.download(ticker, start=..., end=...)`).
- Indian markets: NSE India historical data section, or `jugaad-data`/`nsepy` libraries; use `.NS`/`.BO` ticker suffixes with `yfinance`.
- Fallback (no API dependency risk during demo): pre-download and bundle 2–3 CSVs as preloaded datasets before the hackathon demo.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Auth | Single JWT works across all 3 module routers |
| DataMart query latency | <1s for filter/aggregation on seed dataset |
| Backtest run | Completes asynchronously with a visible loading state; results within a few seconds on seed data |
| AI assistant response | Grounded (RAG/SQL-backed), not free-floating LLM text |
| Security | LLM-generated queries validated against an allow-listed schema before execution — never execute raw LLM SQL directly |
| UI consistency | One shared component library/design system across all 3 modules and the unified dashboard |
| Deployment | Publicly accessible URL (not just localhost) before demo |

---

## 10. Build Order & Timeline (44-hour reference plan)

| Phase | Hours | Deliverable |
|---|---|---|
| 0. Setup & architecture lock-in | 0–2 | Repo scaffolded, schema finalized, stack decisions locked |
| 1. Shared data layer & auth | 2–6 | Login works; empty module endpoints reachable with one token |
| 2. Backtesting module | 6–14 | Real backtest run returns metrics + bias-check badge |
| 3. DataMart module | 14–22 | NL query returns real chart from real data |
| 4. Retail Assistant module | 22–30 | Assistant answers both product and business-data questions, the latter via the shared query engine |
| 5. Integration pass | 30–36 | Unified dashboard, one nav, cross-module widgets |
| 6. Polish & demo prep | 36–44 | Deployed URL, demo script, edge-case handling |

---

## 11. Demo Script Outline (for judges)

1. Log in once → land on unified dashboard.
2. Open Backtesting → run a strategy → show equity curve + bias-check badge.
3. Open DataMart → show auto KPI dashboard → filter → ask a natural-language question live.
4. Open Retail Assistant → ask a product question (RAG) → ask a business-data question (e.g. "what's trending this week?") and explicitly point out it hits the **same backend function** used in DataMart's NL query.
5. Return to unified dashboard → show the backtest result and KPI now reflected there.
6. Close with the architecture diagram, explicitly naming: system architecture, correctness (bias guard), AI integration, usability, scalability, code quality — matching the stated judging emphasis.

---

## 12. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Live API (yfinance) fails during judging | Pre-download and bundle CSVs as default/preloaded datasets |
| LLM generates unsafe/incorrect SQL | Allow-list validation layer between LLM output and DB execution (Section 6.2) |
| Modules built in isolation end up inconsistent | Shared schema (Section 5) and shared query engine (Section 6.2) are mandatory, not optional, for every module |
| Time overrun on any one module | Each module has a minimal MVP defined in Section 7 — cut nice-to-haves (survivorship-bias handling, multi-symbol backtests) before cutting the shared-layer integration |
| Demo-day network issues | Deploy early (Phase 6) and test the live URL, not just localhost |

---

*End of PID. This document should be provided in full to the coding agent as persistent context at the start of the build, and re-referenced whenever generating code for a new module to keep schema and API contracts consistent.*
