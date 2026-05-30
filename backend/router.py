"""Smart model routing — downgrade to a cheaper model for simple prompts."""

import re

from costs import cheapest_alternative

# Signals that suggest the request needs a powerful model
COMPLEX_PATTERNS = re.compile(
    r"\b(code|implement|architect|analyse|analyze|reason|debug|refactor|"
    r"explain in detail|summarize|translate|compare|critique|essay|thesis|"
    r"strategy|business|legal|medical|financial)\b",
    re.IGNORECASE,
)

SIMPLE_THRESHOLD_TOKENS = 200   # short prompts are almost always simple
COMPLEX_THRESHOLD_TOKENS = 800  # long prompts stay on the requested model


def _estimate_tokens(messages: list[dict]) -> int:
    total = 0
    for m in messages:
        content = m.get("content", "")
        if isinstance(content, str):
            total += len(content) // 4  # rough 4-char-per-token heuristic
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    total += len(block.get("text", "")) // 4
    return total


def _has_complex_signal(messages: list[dict]) -> bool:
    for m in messages:
        content = m.get("content", "")
        text = content if isinstance(content, str) else " ".join(
            b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"
        )
        if COMPLEX_PATTERNS.search(text):
            return True
    return False


def maybe_downgrade(provider: str, model: str, messages: list[dict]) -> tuple[str, bool]:
    """Return (model_to_use, was_routed). Routing only happens for clearly simple requests."""
    alternative = cheapest_alternative(provider, model)
    if alternative is None:
        return model, False

    estimated_tokens = _estimate_tokens(messages)

    if estimated_tokens > COMPLEX_THRESHOLD_TOKENS:
        return model, False

    if _has_complex_signal(messages):
        return model, False

    if estimated_tokens <= SIMPLE_THRESHOLD_TOKENS:
        return alternative, True

    return model, False
