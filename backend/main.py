import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from costs import PRICING
from database import Base, engine, get_db
from models import Alert, CacheEntry, Company, UsageRecord
from proxy import router as proxy_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Cost Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proxy_router)

DB = Annotated[Session, Depends(get_db)]


# ─── Pydantic schemas ──────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    budget_usd: float = 100.0


class CompanyOut(BaseModel):
    id: int
    name: str
    api_key: str
    budget_usd: float
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertCreate(BaseModel):
    company_id: int
    threshold_usd: float
    period: str = "monthly"


class AlertOut(BaseModel):
    id: int
    company_id: int
    threshold_usd: float
    period: str
    triggered: bool
    triggered_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Company endpoints ─────────────────────────────────────────────────────────

@app.get("/api/companies", response_model=list[CompanyOut])
def list_companies(db: DB):
    return db.query(Company).all()


@app.post("/api/companies", response_model=CompanyOut)
def create_company(body: CompanyCreate, db: DB):
    if db.query(Company).filter(Company.name == body.name).first():
        raise HTTPException(status_code=400, detail="Company name already exists")
    company = Company(name=body.name, api_key=secrets.token_hex(32), budget_usd=body.budget_usd)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@app.delete("/api/companies/{company_id}")
def delete_company(company_id: int, db: DB):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return {"ok": True}


# ─── Alert endpoints ───────────────────────────────────────────────────────────

@app.get("/api/alerts", response_model=list[AlertOut])
def list_alerts(db: DB, company_id: int | None = None):
    q = db.query(Alert)
    if company_id:
        q = q.filter(Alert.company_id == company_id)
    return q.all()


@app.post("/api/alerts", response_model=AlertOut)
def create_alert(body: AlertCreate, db: DB):
    alert = Alert(**body.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: int, db: DB):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"ok": True}


# ─── Usage / dashboard endpoints ──────────────────────────────────────────────

@app.get("/api/usage")
def get_usage(
    db: DB,
    company_id: int | None = None,
    provider: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    q = db.query(UsageRecord).order_by(UsageRecord.timestamp.desc())
    if company_id:
        q = q.filter(UsageRecord.company_id == company_id)
    if provider:
        q = q.filter(UsageRecord.provider == provider)

    total = q.count()
    records = q.offset(offset).limit(limit).all()

    company_map = {c.id: c.name for c in db.query(Company).all()}

    return {
        "total": total,
        "records": [
            {
                "id": r.id,
                "company": company_map.get(r.company_id, "unknown"),
                "provider": r.provider,
                "model": r.model,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "cost_usd": r.cost_usd,
                "cache_hit": r.cache_hit,
                "routed_from": r.routed_from,
                "savings_usd": r.savings_usd,
                "latency_ms": r.latency_ms,
                "timestamp": r.timestamp.isoformat(),
            }
            for r in records
        ],
    }


@app.get("/api/dashboard")
def get_dashboard(db: DB, company_id: int | None = None, days: int = 30):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    q = db.query(UsageRecord).filter(UsageRecord.timestamp >= since)
    if company_id:
        q = q.filter(UsageRecord.company_id == company_id)

    records = q.all()

    total_cost = sum(r.cost_usd for r in records)
    total_savings = sum(r.savings_usd for r in records)
    total_input = sum(r.input_tokens for r in records)
    total_output = sum(r.output_tokens for r in records)
    cache_hits = sum(1 for r in records if r.cache_hit)
    routed_count = sum(1 for r in records if r.routed_from)
    total_requests = len(records)
    cache_hit_rate = round((cache_hits / total_requests * 100) if total_requests else 0, 1)

    # Daily cost trend
    daily: dict[str, float] = {}
    daily_savings: dict[str, float] = {}
    for r in records:
        day = r.timestamp.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0.0) + r.cost_usd
        daily_savings[day] = daily_savings.get(day, 0.0) + r.savings_usd

    trend = [{"date": d, "cost": round(c, 4), "savings": round(daily_savings.get(d, 0), 4)}
             for d, c in sorted(daily.items())]

    # Cost by model
    model_cost: dict[str, float] = {}
    for r in records:
        key = f"{r.provider}/{r.model}"
        model_cost[key] = model_cost.get(key, 0.0) + r.cost_usd

    by_model = [{"model": m, "cost": round(c, 4)} for m, c in
                sorted(model_cost.items(), key=lambda x: -x[1])]

    # Cost by provider
    provider_cost: dict[str, float] = {}
    for r in records:
        provider_cost[r.provider] = provider_cost.get(r.provider, 0.0) + r.cost_usd

    by_provider = [{"provider": p, "cost": round(c, 4)} for p, c in provider_cost.items()]

    # Savings breakdown
    cache_savings = sum(r.savings_usd for r in records if r.cache_hit)
    routing_savings = sum(r.savings_usd for r in records if r.routed_from and not r.cache_hit)

    savings_breakdown = [
        {"name": "Cache Hits", "value": round(cache_savings, 4)},
        {"name": "Model Routing", "value": round(routing_savings, 4)},
    ]

    # Top companies by cost
    company_cost: dict[int, float] = {}
    for r in records:
        company_cost[r.company_id] = company_cost.get(r.company_id, 0.0) + r.cost_usd

    company_map = {c.id: c.name for c in db.query(Company).all()}
    top_companies = sorted(
        [{"company": company_map.get(cid, "?"), "cost": round(cost, 4)}
         for cid, cost in company_cost.items()],
        key=lambda x: -x["cost"],
    )[:10]

    # Cache stats
    cache_count = db.query(CacheEntry).count()
    total_cache_hits = db.query(func.sum(CacheEntry.hit_count)).scalar() or 0

    return {
        "summary": {
            "total_cost_usd": round(total_cost, 4),
            "total_savings_usd": round(total_savings, 4),
            "savings_pct": round(total_savings / (total_cost + total_savings) * 100, 1) if (total_cost + total_savings) else 0,
            "total_requests": total_requests,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "cache_hit_rate_pct": cache_hit_rate,
            "routed_requests": routed_count,
            "cache_entries": cache_count,
            "total_cache_hits": total_cache_hits,
        },
        "trend": trend,
        "by_model": by_model,
        "by_provider": by_provider,
        "savings_breakdown": savings_breakdown,
        "top_companies": top_companies,
    }


@app.get("/api/pricing")
def get_pricing():
    result = []
    for provider, models in PRICING.items():
        for model, (inp, out) in models.items():
            result.append({"provider": provider, "model": model, "input_per_1m": inp, "output_per_1m": out})
    return result


@app.delete("/api/cache")
def clear_cache(db: DB):
    deleted = db.query(CacheEntry).delete()
    db.commit()
    return {"deleted": deleted}


@app.get("/health")
def health():
    return {"status": "ok"}
