# 🛰️ SERVANAUT V2 — Founder Intelligence OS

**Live site:** https://servanaut.vercel.app

An AI-powered founder intelligence dashboard: the one tab a startup founder opens every morning instead of twelve. SERVANAUT aggregates live news, competitor activity, market data, and research papers, runs everything through an AI analyst primed with *your* business context, and delivers a structured daily briefing, smart alerts, and an email digest.

## Features

- **🌅 AI Daily Briefing** — a five-section morning briefing (Market Pulse, Competitor Moves, Research Highlights, Opportunities, Risks) generated from the last 24 hours of intelligence, stored per-day, regenerable on demand, auto-generated at 7am.
- **📰 Live News Feed** — NewsAPI + The Guardian aggregated and deduplicated, each article enriched with a 2-sentence AI summary, sentiment badge, and 1–10 founder-relevance score. Search, topic/sentiment/date filters, sort by date or relevance, read state, saved collection, and a "Deep Dive" side panel with key claims, founder implications, related companies, and suggested actions.
- **🏢 Competitor Intelligence** — per-competitor news mentions, public GitHub org activity, careers-page hiring signals, funding announcements, and an AI-written intel summary with an AI-assessed threat level (low/medium/high). Threat escalations fire alerts.
- **📈 Market Intelligence** — Alpha Vantage quotes with 30-day sparkline charts for public competitors and tracked tickers, an aggregate news-sentiment gauge (0–100), and a hot-topics keyword frequency cloud.
- **🔬 Research Tracker** — latest ArXiv papers matching your research keywords with 3-sentence plain-English AI summaries and founder-relevance scores, plus GitHub trending repos in your domain.
- **📋 Smart Watchlist** — watch any keyword, company, person, or topic across every data source. Hits create alerts, bump weekly counters, and are browsable per item. Priorities: high/medium/low.
- **🔔 Unified Alerts** — news spikes, competitor threat changes, watchlist hits, and research matches in one stream with unread badge, filters, and one-click "AI Explain This."
- **📧 Email Digest** — daily or weekly HTML digest (briefing + top stories + alerts + research pick) sent via Resend at your configured time, with manual "Send Now" and a sent-history log.
- **⚙️ Deep Personalization** — your company profile (name, description, stage, industry) is injected into every AI prompt so all insights are framed for *your* business.

**Graceful degradation:** every integration is optional. No Supabase → in-memory store. No OpenAI key → heuristic summaries/sentiment. No news keys → guided placeholder. No Alpha Vantage → deterministic demo series. No Resend → digest preview mode. The app always boots and works.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (React + Vite)                    │
│  React Query ── React Router ── Tailwind ── Recharts ── Motion  │
│    Dashboard │ News │ Competitors │ Market │ Research │          │
│    Watchlist │ Alerts │ Settings                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │  /api/*  (Vite proxy in dev)
┌───────────────────────────▼─────────────────────────────────────┐
│                   BACKEND  (Node + Express)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Routes    │→ │  Services    │→ │  Middleware              │ │
│  │  news      │  │  newsService │  │  cache (TTL + stale)     │ │
│  │  briefing  │  │  openai      │  │  rateLimit               │ │
│  │  competit. │  │  market      │  │  errorHandler            │ │
│  │  market    │  │  research    │  └──────────────────────────┘ │
│  │  research  │  │  email       │  ┌──────────────────────────┐ │
│  │  watchlist │  │  supabase    │  │  Scheduler (node-cron)   │ │
│  │  alerts    │  │  scheduler   │  │  news 15m │ briefing 7am │ │
│  │  summarize │  └──────┬───────┘  │  digest window │ arxiv 1h│ │
│  │  digest    │         │          └──────────────────────────┘ │
│  │  settings  │         │                                       │
│  └────────────┘         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
          ┌───────────────┼───────────────────────────┐
          ▼               ▼                           ▼
   ┌────────────┐  ┌─────────────┐   ┌─────────────────────────────┐
   │  Supabase  │  │   OpenAI    │   │  External APIs              │
   │ (Postgres) │  │  (gpt-4o)   │   │  NewsAPI · Guardian · ArXiv │
   └────────────┘  └─────────────┘   │  GitHub · AlphaVantage ·    │
                                     │  Resend                     │
                                     └─────────────────────────────┘
```

## Quick Start

### 1. Prerequisites

- Node.js ≥ 18 (uses native `fetch`)
- npm

### 2. Clone & install

```bash
cd servanaut-v2

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure environment

```bash
# From the repo root:
cp .env.example backend/.env
```

Fill in whatever keys you have — **all are optional** (see the graceful-degradation note above). At minimum, add `OPENAI_API_KEY` and one news key for the full experience.

### 4. Set up Supabase (recommended)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your project dashboard.
3. Paste the entire contents of [`backend/db/schema.sql`](backend/db/schema.sql) and run it. This creates all tables, indexes, triggers, RLS, and seeds a default founder profile.
4. Go to **Project Settings → API** and copy into `backend/.env`:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

> RLS is enabled deny-by-default on every table; the backend accesses the database exclusively with the service-role key. Never expose the service-role key to the browser.

### 5. Run it

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open **http://localhost:5173**, go to **Settings**, fill in your business profile and topics, and the whole dashboard lights up.

## Getting API Keys

| Key | Where | Cost | Notes |
|-----|-------|------|-------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | pay-per-use | Powers all summaries, briefings, threat assessments |
| `NEWS_API_KEY` | [newsapi.org/register](https://newsapi.org/register) | free tier | 100 requests/day on free tier |
| `GUARDIAN_API_KEY` | [open-platform.theguardian.com/access](https://open-platform.theguardian.com/access/) | free | Instant developer key |
| `ALPHA_VANTAGE_KEY` | [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key) | free | 25 requests/day free; demo data used without a key |
| `RESEND_API_KEY` | [resend.com](https://resend.com) | free tier | 3,000 emails/month |
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) | free | No scopes needed (public data); raises rate limits |
| `SUPABASE_*` | [supabase.com](https://supabase.com) | free tier | See setup above |
| `PRODUCT_HUNT_TOKEN` | [api.producthunt.com/v2/oauth/applications](https://api.producthunt.com/v2/oauth/applications) | free | Optional |
| ArXiv | — | free | Public API, no key needed |

## Environment Variable Reference

| Variable | Required | Default behavior when missing |
|----------|----------|-------------------------------|
| `SUPABASE_URL` | no | In-memory store (data lost on restart) |
| `SUPABASE_ANON_KEY` | no | — (backend uses service role) |
| `SUPABASE_SERVICE_ROLE_KEY` | no | In-memory store |
| `OPENAI_API_KEY` | no | Heuristic summaries, keyword sentiment, template briefing |
| `NEWS_API_KEY` | no | Guardian only; placeholder if both news keys missing |
| `GUARDIAN_API_KEY` | no | NewsAPI only; placeholder if both news keys missing |
| `ALPHA_VANTAGE_KEY` | no | Deterministic demo price series (flagged in UI) |
| `RESEND_API_KEY` | no | Digest built + logged as preview, not sent |
| `DIGEST_FROM_EMAIL` | no | `SERVANAUT <onboarding@resend.dev>` |
| `GITHUB_TOKEN` | no | Unauthenticated GitHub API (lower rate limits) |
| `PRODUCT_HUNT_TOKEN` | no | Reserved for Product Hunt integration |
| `PORT` | no | `3001` |
| `FRONTEND_URL` | no | `http://localhost:5173` |
| `NODE_ENV` | no | `development` |

## API Surface

All endpoints return `{ success: true, data: {...} }` (optionally with `stale: true` when a cached fallback was served) or `{ success: false, error: "..." }`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Uptime + which integrations are configured |
| GET | `/api/news` | Aggregated feed (`q`, `topics`, `from`, `to`, `sentiment`, `sort`) |
| GET | `/api/news/saved` | Saved articles |
| POST | `/api/news/:id/read` · `/api/news/:id/save` | Read / save state |
| GET | `/api/briefing` | Today's briefing (generated if missing) |
| POST | `/api/briefing/regenerate` | Force-regenerate |
| GET/POST/PUT/DELETE | `/api/competitors` | Competitor CRUD |
| GET | `/api/competitors/:id/intel` | News + GitHub + hiring + funding |
| POST | `/api/competitors/:id/summary` | Refresh AI intel + threat level |
| GET | `/api/market/quotes` · `/sentiment` · `/hot-topics` | Market panel |
| GET | `/api/research/papers` · `/github` | ArXiv + trending repos |
| GET/POST/PUT/DELETE | `/api/watchlist` | Watchlist CRUD |
| GET | `/api/watchlist/:id/matches` | Recent hits for one item |
| GET | `/api/alerts` · `/unread-count` | Alerts + badge count |
| POST | `/api/alerts/:id/read` · `/read-all` · `/:id/explain` | Alert actions |
| POST | `/api/summarize` | AI deep-dive of one article |
| POST | `/api/digest/send` | Send digest now |
| GET | `/api/digest/history` | Sent digests |
| GET/PUT | `/api/settings` | Founder profile + preferences |

## Background Jobs (node-cron)

| Schedule | Job |
|----------|-----|
| every 15 min | Refresh news, scan watchlist, detect news spikes |
| 07:00 daily | Generate the daily briefing |
| every 15 min | Check digest send window (fires at configured time; Mondays for weekly) |
| hourly | Refresh ArXiv papers, scan watchlist against them |
| Mondays 00:00 | Reset weekly watchlist hit counters |

## Production Notes

- Build the frontend with `npm run build` (in `frontend/`) and serve `dist/` from any static host; set `VITE_API_URL` to the deployed backend URL.
- Set `FRONTEND_URL` on the backend so CORS admits your production origin.
- Rate limiting is on by default: 120 req/min general, 20 req/min on AI endpoints.
- The in-memory route cache means a single backend instance is assumed; put a shared cache (Redis) in front if you scale horizontally.

## Project Structure

```
servanaut-v2/
├── frontend/            React + Vite + Tailwind + shadcn-style UI
│   └── src/
│       ├── components/  layout, ui, news, briefing, competitors,
│       │                watchlist, market, research, github, alerts, settings
│       ├── pages/       Dashboard, NewsFeed, Competitors, Market,
│       │                Research, Watchlist, Alerts, Settings
│       ├── hooks/       React Query hooks per feature
│       └── lib/         api client, query client, supabase, utils
├── backend/
│   ├── routes/          10 modular route files
│   ├── services/        news, openai, market, research, email, supabase, scheduler
│   ├── middleware/      cache (TTL + stale-on-error), errorHandler, rateLimit
│   └── db/schema.sql    Full Supabase schema (paste into SQL editor)
├── .env.example
└── README.md
```
