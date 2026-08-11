# Orbit — EIP: Enterprise Intelligence Platform
> **HACKORBIT · PS-05 · GDG** | *One core. Every business function.*

A unified web platform with three integrated modules sharing one database, one auth token, and one AI query engine.

---

## Architecture

```
Frontend (Next.js 16 · React 19 · Tailwind 4)  ?  Vercel
Backend  (FastAPI · Python)                     ?  Render
Database (PostgreSQL)                           ?  Supabase
Analytics (DuckDB embedded)                     ?  in-process
Vector DB (ChromaDB)                            ?  in-process
LLM      (Claude API · mock mode supported)     ?  Anthropic
```

## Modules

| Module | Description | Key Feature |
|---|---|---|
| **Backtesting** | Trading strategy evaluation | Look-ahead bias guard (`df[df.index <= current_date]`) |
| **DataMart** | Transactional analytics & KPIs | DuckDB sub-second queries + NL interface |
| **AI Assistant** | Product RAG + business data queries | Same `query_engine` as DataMart (cross-module proof) |

---

## Quick Start

### Backend
```bash
cd platform/backend
python -m venv venv
.\venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env             # fill in your Supabase + Claude keys
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd platform/frontend
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                        # ? http://localhost:3000
```

### Database
1. Create a project at [supabase.com](https://supabase.com)
2. Run `platform/docs/schema.sql` in the Supabase SQL Editor
3. Add your `DATABASE_URL` to `backend/.env`

---

## Environment Variables

### Backend (`platform/backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `ANTHROPIC_API_KEY` | Claude API key |
| `LLM_MOCK` | `true` to use mock LLM (no API key needed for demo) |

### Frontend (`platform/frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (http://localhost:8000 or Render URL) |

---

## Demo Script (Judges)
1. Log in ? Unified Dashboard
2. **Backtesting** ? Run SMA Crossover on AAPL ? Equity curve + ? Bias Check badge
3. **DataMart** ? KPI cards ? Filter ? Ask "What was revenue in Q1?"
4. **AI Assistant** ? Ask product question (RAG path) ? Ask business question ? point out same `shared/query_engine.py` fires
5. Return to Dashboard ? see backtest result + KPI reflected

---

## Folder Structure
```
/platform
  /frontend          Next.js app
  /backend
    /auth            JWT auth endpoints
    /shared          DB models, LLM client, shared query engine
    /backtesting     Bias-guard engine + strategies
    /datamart        DuckDB aggregation + NL query
    /retail_assistant ChromaDB RAG + intent router
  /data/seed         CSV seed files
  /docs              schema.sql, architecture diagram
```
