"""Stripe billing — checkout, customer portal, webhooks."""

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import Company, Subscription

router = APIRouter(prefix="/api/billing")

stripe.api_key = settings.stripe_secret_key

PLANS = {
    "starter": {
        "name": "Starter",
        "monthly": settings.stripe_starter_monthly_price_id,
        "annual":  settings.stripe_starter_annual_price_id,
        "companies": 5,
        "requests_per_month": 10_000_000,
    },
    "growth": {
        "name": "Growth",
        "monthly": settings.stripe_growth_monthly_price_id,
        "annual":  settings.stripe_growth_annual_price_id,
        "companies": 25,
        "requests_per_month": 100_000_000,
    },
    "enterprise": {
        "name": "Enterprise",
        "monthly": settings.stripe_enterprise_monthly_price_id,
        "annual":  settings.stripe_enterprise_annual_price_id,
        "companies": -1,          # unlimited
        "requests_per_month": -1,
    },
}


def _get_company(db: Session, x_tracker_key: str) -> Company:
    company = db.query(Company).filter(Company.api_key == x_tracker_key).first()
    if not company:
        raise HTTPException(status_code=401, detail="Invalid X-Tracker-Key")
    return company


class CheckoutRequest(BaseModel):
    plan: str           # starter | growth | enterprise
    billing: str        # monthly | annual
    company_id: int
    customer_email: str


@router.post("/checkout")
def create_checkout(body: CheckoutRequest, db: Session = Depends(get_db)):
    if body.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")
    if body.billing not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail="billing must be 'monthly' or 'annual'")

    price_id = PLANS[body.plan][body.billing]
    if not price_id:
        raise HTTPException(status_code=503, detail="Stripe price IDs not configured yet. Set them in .env")

    company = db.query(Company).filter(Company.id == body.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer_email=body.customer_email,
        success_url=f"{settings.app_url}/?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/?checkout=cancelled",
        metadata={"company_id": str(body.company_id), "plan": body.plan},
        subscription_data={"metadata": {"company_id": str(body.company_id), "plan": body.plan}},
        allow_promotion_codes=True,
    )
    return {"url": session.url}


@router.post("/portal")
def customer_portal(company_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{settings.app_url}/",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    et = event["type"]

    if et == "checkout.session.completed":
        session = event["data"]["object"]
        company_id = int(session["metadata"].get("company_id", 0))
        plan = session["metadata"].get("plan", "starter")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        _upsert_subscription(db, company_id, plan, customer_id, subscription_id, "active")

    elif et in ("customer.subscription.updated", "customer.subscription.created"):
        sub_obj = event["data"]["object"]
        company_id = int(sub_obj["metadata"].get("company_id", 0))
        plan = sub_obj["metadata"].get("plan", "starter")
        status = sub_obj.get("status", "active")
        _upsert_subscription(db, company_id, plan, sub_obj["customer"], sub_obj["id"], status)

    elif et == "customer.subscription.deleted":
        sub_obj = event["data"]["object"]
        company_id = int(sub_obj["metadata"].get("company_id", 0))
        existing = db.query(Subscription).filter(Subscription.company_id == company_id).first()
        if existing:
            existing.status = "cancelled"
            db.commit()

    return {"ok": True}


def _upsert_subscription(db, company_id, plan, customer_id, subscription_id, status):
    existing = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if existing:
        existing.plan = plan
        existing.stripe_customer_id = customer_id
        existing.stripe_subscription_id = subscription_id
        existing.status = status
    else:
        db.add(Subscription(
            company_id=company_id,
            plan=plan,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            status=status,
        ))
    db.commit()


@router.get("/status/{company_id}")
def get_subscription_status(company_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        return {"plan": "free", "status": "none"}
    return {
        "plan": sub.plan,
        "status": sub.status,
        "stripe_customer_id": sub.stripe_customer_id,
    }


@router.get("/plans")
def get_plans():
    return [
        {
            "id": "starter",
            "name": "Starter",
            "monthly_usd": 49,
            "annual_usd": 39,
            "companies": 5,
            "requests": "10M / month",
            "features": ["Response caching", "Model routing", "3 providers", "Usage dashboard", "Budget alerts"],
            "highlight": False,
        },
        {
            "id": "growth",
            "name": "Growth",
            "monthly_usd": 149,
            "annual_usd": 119,
            "companies": 25,
            "requests": "100M / month",
            "features": ["Everything in Starter", "25 companies", "Priority support", "CSV export", "Webhook alerts"],
            "highlight": True,
        },
        {
            "id": "enterprise",
            "name": "Enterprise",
            "monthly_usd": 499,
            "annual_usd": 399,
            "companies": -1,
            "requests": "Unlimited",
            "features": ["Everything in Growth", "Unlimited companies", "SLA guarantee", "SSO / SAML", "Dedicated support"],
            "highlight": False,
        },
    ]
