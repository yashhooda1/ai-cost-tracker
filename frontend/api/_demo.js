// Shared demo data for all Vercel serverless API routes

export const COMPANIES = [
  { id: 1, name: "Acme Corp",         api_key: "demo-key-acme",       budget_usd: 500,  created_at: "2026-04-29T00:00:00" },
  { id: 2, name: "StartupXYZ",        api_key: "demo-key-startup",    budget_usd: 100,  created_at: "2026-04-29T00:00:00" },
  { id: 3, name: "BigEnterprise Inc", api_key: "demo-key-enterprise", budget_usd: 5000, created_at: "2026-04-29T00:00:00" },
  { id: 4, name: "Dev Studio",        api_key: "demo-key-dev",        budget_usd: 200,  created_at: "2026-04-29T00:00:00" },
];

const MODELS = {
  openai:    ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-8"],
  google:    ["gemini-2.0-flash", "gemini-1.5-pro"],
};

const COSTS = {
  "gpt-4o": [2.50, 10.00], "gpt-4o-mini": [0.15, 0.60], "gpt-3.5-turbo": [0.50, 1.50],
  "claude-sonnet-4-6": [3.00, 15.00], "claude-haiku-4-5-20251001": [0.80, 4.00], "claude-opus-4-8": [15.00, 75.00],
  "gemini-2.0-flash": [0.10, 0.40], "gemini-1.5-pro": [3.50, 10.50],
};

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export function buildDashboard() {
  const rand = seededRandom(42);
  const trend = [];
  let totalCost = 0, totalSavings = 0, totalRequests = 0;
  let totalInput = 0, totalOutput = 0, cacheHits = 0, routed = 0;

  for (let d = 29; d >= 0; d--) {
    const date = new Date("2026-05-29");
    date.setDate(date.getDate() - d);
    const label = date.toISOString().slice(0, 10);
    const n = Math.floor(rand() * 60) + 20;
    let dayCost = 0, daySavings = 0;

    for (let i = 0; i < n; i++) {
      const providers = Object.keys(MODELS);
      const provider = providers[Math.floor(rand() * providers.length)];
      const model = MODELS[provider][Math.floor(rand() * MODELS[provider].length)];
      const inp = Math.floor(rand() * 1800) + 100;
      const out = Math.floor(rand() * 600) + 50;
      const [ir, or] = COSTS[model] || [3, 15];
      const cost = (inp / 1e6) * ir + (out / 1e6) * or;
      const hit = rand() < 0.18;
      const wasRouted = !hit && rand() < 0.14;
      const savings = (hit || wasRouted) ? cost * (rand() * 0.4 + 0.3) : 0;

      dayCost += hit ? 0 : cost;
      daySavings += savings;
      totalInput += inp; totalOutput += out;
      if (hit) cacheHits++;
      if (wasRouted) routed++;
      totalRequests++;
    }
    totalCost += dayCost; totalSavings += daySavings;
    trend.push({ date: label, cost: Math.round(dayCost * 1e4) / 1e4, savings: Math.round(daySavings * 1e4) / 1e4 });
  }

  return {
    summary: {
      total_cost_usd: Math.round(totalCost * 1e4) / 1e4,
      total_savings_usd: Math.round(totalSavings * 1e4) / 1e4,
      savings_pct: Math.round(totalSavings / (totalCost + totalSavings) * 1000) / 10,
      total_requests: totalRequests,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      cache_hit_rate_pct: Math.round(cacheHits / totalRequests * 1000) / 10,
      routed_requests: routed,
      cache_entries: 127,
      total_cache_hits: cacheHits,
    },
    trend,
    by_model: [
      { model: "openai/gpt-4o",            cost: 4.12 },
      { model: "anthropic/claude-sonnet-4-6", cost: 2.87 },
      { model: "google/gemini-1.5-pro",     cost: 1.63 },
      { model: "openai/gpt-4o-mini",        cost: 0.94 },
      { model: "anthropic/claude-haiku-4-5-20251001", cost: 0.48 },
      { model: "google/gemini-2.0-flash",   cost: 0.21 },
    ],
    by_provider: [
      { provider: "openai",    cost: 5.06 },
      { provider: "anthropic", cost: 3.35 },
      { provider: "google",    cost: 1.84 },
    ],
    savings_breakdown: [
      { name: "Cache Hits",    value: Math.round(totalSavings * 0.62 * 1e4) / 1e4 },
      { name: "Model Routing", value: Math.round(totalSavings * 0.38 * 1e4) / 1e4 },
    ],
    top_companies: [
      { company: "BigEnterprise Inc", cost: 5.21 },
      { company: "Acme Corp",         cost: 3.14 },
      { company: "Dev Studio",        cost: 1.52 },
      { company: "StartupXYZ",        cost: 0.38 },
    ],
  };
}

export function buildUsage() {
  const rand = seededRandom(99);
  const companies = ["Acme Corp", "StartupXYZ", "BigEnterprise Inc", "Dev Studio"];
  const providers = Object.keys(MODELS);
  const records = [];

  for (let i = 0; i < 50; i++) {
    const provider = providers[Math.floor(rand() * providers.length)];
    const model = MODELS[provider][Math.floor(rand() * MODELS[provider].length)];
    const inp = Math.floor(rand() * 1800) + 100;
    const out = Math.floor(rand() * 600) + 50;
    const [ir, or] = COSTS[model] || [3, 15];
    const cost = (inp / 1e6) * ir + (out / 1e6) * or;
    const hit = rand() < 0.18;
    const wasRouted = !hit && rand() < 0.14;
    const savings = (hit || wasRouted) ? cost * (rand() * 0.4 + 0.3) : 0;
    const daysAgo = Math.floor(rand() * 30);
    const ts = new Date("2026-05-29"); ts.setDate(ts.getDate() - daysAgo);

    records.push({
      id: i + 1,
      company: companies[Math.floor(rand() * companies.length)],
      provider, model,
      input_tokens: inp, output_tokens: out,
      cost_usd: Math.round((hit ? 0 : cost) * 1e6) / 1e6,
      cache_hit: hit,
      routed_from: wasRouted ? (model.includes("mini") || model.includes("haiku") || model.includes("flash") ? "gpt-4o" : null) : null,
      savings_usd: Math.round(savings * 1e6) / 1e6,
      latency_ms: hit ? 4 : Math.floor(rand() * 3000) + 200,
      timestamp: ts.toISOString(),
    });
  }
  return { total: 1447, records };
}
