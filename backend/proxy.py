"""Proxy handlers for OpenAI, Anthropic, and Google AI APIs."""

import json
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from cache import compute_hash, get_cached, store_cache
from costs import calculate_cost
from database import get_db
from models import Company, UsageRecord
from router import maybe_downgrade

router = APIRouter(prefix="/proxy")

OPENAI_BASE = "https://api.openai.com"
ANTHROPIC_BASE = "https://api.anthropic.com"
GOOGLE_BASE = "https://generativelanguage.googleapis.com"


def _get_company(db: Session, x_tracker_key: str) -> Company:
    company = db.query(Company).filter(Company.api_key == x_tracker_key).first()
    if not company:
        raise HTTPException(status_code=401, detail="Invalid X-Tracker-Key. Register your company first.")
    return company


def _record_usage(
    db: Session,
    company: Company,
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_hit: bool,
    routed_from: str | None,
    savings_usd: float,
    latency_ms: int,
    request_hash: str | None,
):
    cost = calculate_cost(provider, model, input_tokens, output_tokens)
    record = UsageRecord(
        company_id=company.id,
        provider=provider,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost,
        cache_hit=cache_hit,
        routed_from=routed_from,
        savings_usd=savings_usd,
        latency_ms=latency_ms,
        request_hash=request_hash,
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(record)
    db.commit()
    return cost


# ─── OpenAI ──────────────────────────────────────────────────────────────────

@router.post("/openai/v1/chat/completions")
async def proxy_openai_chat(
    request: Request,
    db: Session = Depends(get_db),
    x_tracker_key: str = Header(..., alias="X-Tracker-Key"),
    authorization: str = Header(...),
):
    company = _get_company(db, x_tracker_key)
    body = await request.json()

    original_model: str = body.get("model", "gpt-4o")
    messages: list[dict] = body.get("messages", [])

    routed_model, was_routed = maybe_downgrade("openai", original_model, messages)
    body["model"] = routed_model

    cached = get_cached(db, "openai", routed_model, messages)
    if cached:
        savings = calculate_cost("openai", original_model, cached.input_tokens, cached.output_tokens)
        _record_usage(db, company, "openai", routed_model, cached.input_tokens, cached.output_tokens,
                      True, original_model if was_routed else None, savings, 0, cached.request_hash)
        return JSONResponse(json.loads(cached.response_json))

    headers = {"Authorization": authorization, "Content-Type": "application/json"}
    t0 = time.monotonic()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{OPENAI_BASE}/v1/chat/completions", json=body, headers=headers)

    latency = int((time.monotonic() - t0) * 1000)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    usage = data.get("usage", {})
    input_tok = usage.get("prompt_tokens", 0)
    output_tok = usage.get("completion_tokens", 0)

    req_hash = store_cache(db, "openai", routed_model, messages, resp.text, input_tok, output_tok)

    savings = 0.0
    if was_routed:
        original_cost = calculate_cost("openai", original_model, input_tok, output_tok)
        routed_cost = calculate_cost("openai", routed_model, input_tok, output_tok)
        savings = max(0.0, original_cost - routed_cost)

    _record_usage(db, company, "openai", routed_model, input_tok, output_tok,
                  False, original_model if was_routed else None, savings, latency, req_hash)
    return JSONResponse(data)


# ─── Anthropic ───────────────────────────────────────────────────────────────

@router.post("/anthropic/v1/messages")
async def proxy_anthropic_messages(
    request: Request,
    db: Session = Depends(get_db),
    x_tracker_key: str = Header(..., alias="X-Tracker-Key"),
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    company = _get_company(db, x_tracker_key)
    body = await request.json()

    original_model: str = body.get("model", "claude-sonnet-4-6")
    messages: list[dict] = body.get("messages", [])

    routed_model, was_routed = maybe_downgrade("anthropic", original_model, messages)
    body["model"] = routed_model

    # Add Anthropic prompt caching header on the system prompt if present
    if "system" in body and isinstance(body["system"], str):
        body["system"] = [
            {"type": "text", "text": body["system"], "cache_control": {"type": "ephemeral"}}
        ]

    cached = get_cached(db, "anthropic", routed_model, messages)
    if cached:
        savings = calculate_cost("anthropic", original_model, cached.input_tokens, cached.output_tokens)
        _record_usage(db, company, "anthropic", routed_model, cached.input_tokens, cached.output_tokens,
                      True, original_model if was_routed else None, savings, 0, cached.request_hash)
        return JSONResponse(json.loads(cached.response_json))

    headers = {
        "x-api-key": x_api_key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "Content-Type": "application/json",
    }
    t0 = time.monotonic()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{ANTHROPIC_BASE}/v1/messages", json=body, headers=headers)

    latency = int((time.monotonic() - t0) * 1000)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    usage = data.get("usage", {})
    input_tok = usage.get("input_tokens", 0)
    output_tok = usage.get("output_tokens", 0)

    req_hash = store_cache(db, "anthropic", routed_model, messages, resp.text, input_tok, output_tok)

    savings = 0.0
    if was_routed:
        original_cost = calculate_cost("anthropic", original_model, input_tok, output_tok)
        routed_cost = calculate_cost("anthropic", routed_model, input_tok, output_tok)
        savings = max(0.0, original_cost - routed_cost)

    _record_usage(db, company, "anthropic", routed_model, input_tok, output_tok,
                  False, original_model if was_routed else None, savings, latency, req_hash)
    return JSONResponse(data)


# ─── Google ───────────────────────────────────────────────────────────────────

@router.post("/google/v1beta/models/{model_id}:generateContent")
async def proxy_google_generate(
    model_id: str,
    request: Request,
    db: Session = Depends(get_db),
    x_tracker_key: str = Header(..., alias="X-Tracker-Key"),
):
    company = _get_company(db, x_tracker_key)
    body = await request.json()
    api_key = request.query_params.get("key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Missing ?key= query param for Google API")

    contents: list[dict] = body.get("contents", [])
    messages = [{"role": c.get("role", "user"), "content": c.get("parts", [{}])[0].get("text", "")}
                for c in contents]

    routed_model, was_routed = maybe_downgrade("google", model_id, messages)

    cached = get_cached(db, "google", routed_model, messages)
    if cached:
        savings = calculate_cost("google", model_id, cached.input_tokens, cached.output_tokens)
        _record_usage(db, company, "google", routed_model, cached.input_tokens, cached.output_tokens,
                      True, model_id if was_routed else None, savings, 0, cached.request_hash)
        return JSONResponse(json.loads(cached.response_json))

    url = f"{GOOGLE_BASE}/v1beta/models/{routed_model}:generateContent?key={api_key}"
    t0 = time.monotonic()
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=body, headers={"Content-Type": "application/json"})

    latency = int((time.monotonic() - t0) * 1000)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    meta = data.get("usageMetadata", {})
    input_tok = meta.get("promptTokenCount", 0)
    output_tok = meta.get("candidatesTokenCount", 0)

    req_hash = store_cache(db, "google", routed_model, messages, resp.text, input_tok, output_tok)

    savings = 0.0
    if was_routed:
        original_cost = calculate_cost("google", model_id, input_tok, output_tok)
        routed_cost = calculate_cost("google", routed_model, input_tok, output_tok)
        savings = max(0.0, original_cost - routed_cost)

    _record_usage(db, company, "google", routed_model, input_tok, output_tok,
                  False, model_id if was_routed else None, savings, latency, req_hash)
    return JSONResponse(data)
