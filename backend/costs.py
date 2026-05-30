# Pricing per 1M tokens (USD) — (input, output)
PRICING: dict[str, dict[str, tuple[float, float]]] = {
    "openai": {
        "gpt-4o":              (2.50,  10.00),
        "gpt-4o-mini":         (0.15,   0.60),
        "gpt-4-turbo":         (10.00, 30.00),
        "gpt-3.5-turbo":       (0.50,   1.50),
        "o1":                  (15.00, 60.00),
        "o1-mini":             (3.00,  12.00),
        "o3-mini":             (1.10,   4.40),
    },
    "anthropic": {
        "claude-opus-4-8":                   (15.00, 75.00),
        "claude-sonnet-4-6":                 (3.00,  15.00),
        "claude-haiku-4-5-20251001":         (0.80,   4.00),
        "claude-3-5-sonnet-20241022":        (3.00,  15.00),
        "claude-3-5-haiku-20241022":         (0.80,   4.00),
        "claude-3-haiku-20240307":           (0.25,   1.25),
        "claude-3-opus-20240229":            (15.00, 75.00),
    },
    "google": {
        "gemini-2.5-pro":     (1.25,  10.00),
        "gemini-2.0-flash":   (0.10,   0.40),
        "gemini-1.5-pro":     (3.50,  10.50),
        "gemini-1.5-flash":   (0.075,  0.30),
    },
}

# Cheap downgrade targets per provider
DOWNGRADE_MAP: dict[str, dict[str, str]] = {
    "openai": {
        "gpt-4o":      "gpt-4o-mini",
        "gpt-4-turbo": "gpt-4o-mini",
        "o1":          "o3-mini",
    },
    "anthropic": {
        "claude-opus-4-8":            "claude-haiku-4-5-20251001",
        "claude-sonnet-4-6":          "claude-haiku-4-5-20251001",
        "claude-3-5-sonnet-20241022": "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229":     "claude-3-haiku-20240307",
    },
    "google": {
        "gemini-2.5-pro":  "gemini-2.0-flash",
        "gemini-1.5-pro":  "gemini-1.5-flash",
    },
}


def calculate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    models = PRICING.get(provider, {})
    rates = models.get(model)
    if rates is None:
        # Unknown model — use a safe default
        rates = (5.00, 15.00)
    input_cost = (input_tokens / 1_000_000) * rates[0]
    output_cost = (output_tokens / 1_000_000) * rates[1]
    return round(input_cost + output_cost, 8)


def cheapest_alternative(provider: str, model: str) -> str | None:
    return DOWNGRADE_MAP.get(provider, {}).get(model)
