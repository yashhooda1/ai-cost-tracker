"""Run once to populate the DB with demo companies and usage records."""

import random
import secrets
from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
from models import Alert, CacheEntry, Company, UsageRecord

Base.metadata.create_all(bind=engine)

PROVIDERS = {
    "openai": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    "anthropic": ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-8"],
    "google": ["gemini-2.0-flash", "gemini-1.5-pro"],
}

COSTS = {
    "gpt-4o": (2.50, 10.00), "gpt-4o-mini": (0.15, 0.60), "gpt-3.5-turbo": (0.50, 1.50),
    "claude-sonnet-4-6": (3.00, 15.00), "claude-haiku-4-5-20251001": (0.80, 4.00),
    "claude-opus-4-8": (15.00, 75.00),
    "gemini-2.0-flash": (0.10, 0.40), "gemini-1.5-pro": (3.50, 10.50),
}

COMPANIES = [
    ("Acme Corp", 500.0),
    ("StartupXYZ", 100.0),
    ("BigEnterprise Inc", 5000.0),
    ("Dev Studio", 200.0),
]

db = SessionLocal()

# Clear existing demo data
db.query(UsageRecord).delete()
db.query(CacheEntry).delete()
db.query(Alert).delete()
db.query(Company).delete()
db.commit()

companies = []
for name, budget in COMPANIES:
    c = Company(name=name, api_key=secrets.token_hex(32), budget_usd=budget)
    db.add(c)
    db.flush()
    companies.append(c)

db.commit()

now = datetime.utcnow()

# Generate 30 days of usage
for day_offset in range(30):
    ts_base = now - timedelta(days=30 - day_offset)
    n_requests = random.randint(10, 80)

    for _ in range(n_requests):
        company = random.choice(companies)
        provider = random.choice(list(PROVIDERS.keys()))
        model = random.choice(PROVIDERS[provider])
        input_tok = random.randint(50, 2000)
        output_tok = random.randint(20, 800)
        rates = COSTS.get(model, (3.0, 15.0))
        cost = round((input_tok / 1e6) * rates[0] + (output_tok / 1e6) * rates[1], 8)

        cache_hit = random.random() < 0.20
        was_routed = (not cache_hit) and random.random() < 0.15
        savings = cost * random.uniform(0.3, 0.8) if (cache_hit or was_routed) else 0.0

        db.add(UsageRecord(
            company_id=company.id,
            provider=provider,
            model=model,
            input_tokens=input_tok,
            output_tokens=output_tok,
            cost_usd=0.0 if cache_hit else cost,
            cache_hit=cache_hit,
            routed_from=random.choice(["gpt-4o", "claude-opus-4-8"]) if was_routed else None,
            savings_usd=round(savings, 8),
            latency_ms=random.randint(200, 3500) if not cache_hit else 5,
            timestamp=ts_base + timedelta(seconds=random.randint(0, 86400)),
        ))

db.commit()

print(f"Seeded {len(companies)} companies and 30 days of usage data.")
company_info = [(c.name, c.api_key) for c in companies]

db.close()

for name, key in company_info:
    print(f"  {name}: X-Tracker-Key = {key}")
