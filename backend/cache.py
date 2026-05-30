import hashlib
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import CacheEntry


CACHE_TTL_HOURS = 24


def _make_hash(provider: str, model: str, messages: list[dict]) -> str:
    payload = json.dumps({"provider": provider, "model": model, "messages": messages}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def get_cached(db: Session, provider: str, model: str, messages: list[dict]) -> CacheEntry | None:
    h = _make_hash(provider, model, messages)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    entry = db.query(CacheEntry).filter(
        CacheEntry.request_hash == h,
        CacheEntry.expires_at > now,
    ).first()
    if entry:
        entry.hit_count += 1
        db.commit()
    return entry


def store_cache(
    db: Session,
    provider: str,
    model: str,
    messages: list[dict],
    response_json: str,
    input_tokens: int,
    output_tokens: int,
) -> str:
    h = _make_hash(provider, model, messages)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires = now + timedelta(hours=CACHE_TTL_HOURS)

    existing = db.query(CacheEntry).filter(CacheEntry.request_hash == h).first()
    if existing:
        existing.response_json = response_json
        existing.expires_at = expires
    else:
        entry = CacheEntry(
            request_hash=h,
            provider=provider,
            model=model,
            response_json=response_json,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            expires_at=expires,
        )
        db.add(entry)
    db.commit()
    return h


def compute_hash(provider: str, model: str, messages: list[dict]) -> str:
    return _make_hash(provider, model, messages)
