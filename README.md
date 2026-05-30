# AI Cost Tracker

**Track, cache, and reduce AI API spend across every provider — for every team in your company.**

Built as a transparent proxy in front of OpenAI, Anthropic, and Google AI. Drop it between your app and the AI provider; get instant visibility and automatic cost savings with zero code changes.

![Dashboard](https://raw.githubusercontent.com/yashh/ai-cost-tracker/main/docs/dashboard.png)

---

## Features

| Feature | Description |
|---|---|
| **Universal Proxy** | Sits in front of OpenAI, Anthropic (Claude), and Google Gemini |
| **Token Tracking** | Every request logged with input/output tokens and USD cost |
| **Response Cache** | SHA-256 cache with 24h TTL — identical prompts return instantly at $0 |
| **Smart Model Routing** | Short/simple prompts auto-downgrade (GPT-4o→mini, Opus→Haiku, Pro→Flash) |
| **Prompt Caching** | Anthropic `cache_control` headers added automatically |
| **Per-Company Isolation** | Multi-tenant: each company gets its own `X-Tracker-Key` |
| **Budget Alerts** | Daily/monthly $ thresholds per company |
| **Live Dashboard** | Cost trends, model breakdown, savings analysis, usage table |

---

## Architecture

```
Your App
   │
   ▼
AI Cost Tracker Proxy  (FastAPI · localhost:8000)
   ├── cache.py        — SHA-256 response cache (SQLite, 24h TTL)
   ├── router.py       — Smart model downgrade engine
   ├── costs.py        — Pricing tables (19 models, 3 providers)
   └── models.py       — Company / UsageRecord / CacheEntry / Alert
   │
   ├──► OpenAI API
   ├──► Anthropic API
   └──► Google Gemini API

React Dashboard  (Vite · localhost:5173)
   ├── Dashboard       — Cost & savings charts, usage table
   ├── Companies       — API key management
   ├── Alerts          — Budget threshold config
   └── Pricing         — Model pricing reference
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yashh/ai-cost-tracker.git
cd ai-cost-tracker
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python seed_demo.py     # optional: load 30 days of demo data
uvicorn main:app --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — dashboard is live.

### 2. Register your company

Go to **Companies** tab → Add your company → copy your `X-Tracker-Key`.

### 3. Point your SDK at the proxy

**OpenAI (Python):**
```python
from openai import OpenAI

client = OpenAI(
    api_key="your-openai-key",
    base_url="http://localhost:8000/proxy/openai/v1",
    default_headers={"X-Tracker-Key": "your-company-key"},
)
```

**Anthropic (Python):**
```python
import anthropic

client = anthropic.Anthropic(
    api_key="your-anthropic-key",
    base_url="http://localhost:8000/proxy/anthropic",
    default_headers={"X-Tracker-Key": "your-company-key"},
)
```

**Direct curl:**
```bash
# OpenAI
curl http://localhost:8000/proxy/openai/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "X-Tracker-Key: your-company-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'

# Anthropic
curl http://localhost:8000/proxy/anthropic/v1/messages \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "X-Tracker-Key: your-company-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'
```

---

## Supported Models & Pricing

| Provider | Model | Input ($/1M) | Output ($/1M) |
|---|---|---|---|
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| OpenAI | o1 | $15.00 | $60.00 |
| Anthropic | claude-opus-4-8 | $15.00 | $75.00 |
| Anthropic | claude-sonnet-4-6 | $3.00 | $15.00 |
| Anthropic | claude-haiku-4-5 | $0.80 | $4.00 |
| Google | gemini-2.5-pro | $1.25 | $10.00 |
| Google | gemini-2.0-flash | $0.10 | $0.40 |

*Full pricing table in the dashboard → Pricing tab.*

---

## API Reference

| Endpoint | Description |
|---|---|
| `POST /proxy/openai/v1/chat/completions` | OpenAI chat proxy |
| `POST /proxy/anthropic/v1/messages` | Anthropic messages proxy |
| `POST /proxy/google/v1beta/models/{model}:generateContent` | Google Gemini proxy |
| `GET /api/dashboard` | Aggregated dashboard data |
| `GET /api/usage` | Paginated usage records |
| `GET /api/companies` | List companies |
| `POST /api/companies` | Create company + API key |
| `GET /api/alerts` | Budget alerts |
| `DELETE /api/cache` | Clear response cache |
| `GET /docs` | Interactive Swagger UI |

---

## Tech Stack

- **Backend**: Python · FastAPI · SQLAlchemy · SQLite · httpx
- **Frontend**: React 18 · TypeScript · Vite · Tailwind CSS · Recharts
- **Proxy**: Transparent HTTP proxy with async streaming

---

## Cost Savings in Practice

From a 30-day demo with 4 companies and ~1,500 requests:
- **$1.79 saved** out of $10.33 total spend = **14.8% reduction**
- 18% cache hit rate (duplicate prompts return in <5ms)
- Model routing catches simple prompts and sends them to cheaper tiers

At $10k/month AI spend, a 15% savings rate = **$1,500/month back** — automatically.

---

## License

MIT — free to use, modify, and deploy.

Built by [Yash Hooda](https://linkedin.com/in/yashhooda)
