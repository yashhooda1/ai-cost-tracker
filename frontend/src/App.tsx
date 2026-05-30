import { useCallback, useEffect, useState } from "react";
import { BarChart2, Building2, Bell, DollarSign, RefreshCw, Trash2, BookOpen } from "lucide-react";
import {
  Alert, Company, DashboardData, PricingRow, UsageRecord,
  getAlerts, getCompanies, getDashboard, getPricing, getUsage, clearCache,
} from "./api";
import StatCard from "./components/StatCard";
import TrendChart from "./components/TrendChart";
import ModelBreakdown from "./components/ModelBreakdown";
import SavingsChart from "./components/SavingsChart";
import UsageTable from "./components/UsageTable";
import CompanyManager from "./components/CompanyManager";
import AlertsPanel from "./components/AlertsPanel";
import PricingTable from "./components/PricingTable";

type Tab = "dashboard" | "companies" | "alerts" | "pricing";

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <BarChart2 size={16} /> },
  { id: "companies", label: "Companies", icon: <Building2 size={16} /> },
  { id: "alerts", label: "Alerts", icon: <Bell size={16} /> },
  { id: "pricing", label: "Pricing", icon: <BookOpen size={16} /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [days, setDays] = useState(30);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | undefined>();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cos, dash, usage, alts] = await Promise.all([
        getCompanies(),
        getDashboard(selectedCompany, days),
        getUsage({ company_id: selectedCompany, limit: 50 }),
        getAlerts(),
      ]);
      setCompanies(cos);
      setDashboard(dash);
      setUsageRecords(usage.records);
      setAlerts(alts);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, days]);

  const loadPricing = useCallback(async () => {
    const rows = await getPricing();
    setPricing(rows);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (tab === "pricing") loadPricing(); }, [tab, loadPricing]);

  const handleClearCache = async () => {
    if (!confirm("Clear all cached responses?")) return;
    await clearCache();
    loadAll();
  };

  const s = dashboard?.summary;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <DollarSign size={22} className="text-indigo-400" />
        <span className="text-lg font-bold text-white">AI Cost Tracker</span>
        <span className="text-gray-600 text-sm ml-1">— track, cache, route</span>
        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500">
          Last refresh: {lastRefresh.toLocaleTimeString()}
          <button onClick={loadAll} className="text-gray-400 hover:text-white transition" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-48 border-r border-gray-800 p-4 flex flex-col gap-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition text-left
                ${tab === n.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </nav>

        {/* Main */}
        <main className="flex-1 p-6 overflow-auto">
          {/* ── Dashboard ── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  value={selectedCompany ?? ""}
                  onChange={e => setSelectedCompany(e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  value={days}
                  onChange={e => setDays(parseInt(e.target.value))}
                >
                  {[7, 14, 30, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
                </select>
                <button
                  onClick={handleClearCache}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-400 transition ml-auto"
                >
                  <Trash2 size={13} /> Clear Cache
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Cost"
                  value={`$${s?.total_cost_usd.toFixed(4) ?? "—"}`}
                  sub={`${(s?.total_requests ?? 0).toLocaleString()} requests`}
                  color="text-red-400"
                />
                <StatCard
                  label="Total Saved"
                  value={`$${s?.total_savings_usd.toFixed(4) ?? "—"}`}
                  sub={`${s?.savings_pct ?? 0}% savings rate`}
                  color="text-emerald-400"
                />
                <StatCard
                  label="Cache Hit Rate"
                  value={`${s?.cache_hit_rate_pct ?? 0}%`}
                  sub={`${s?.cache_entries ?? 0} entries · ${s?.total_cache_hits ?? 0} hits`}
                  color="text-blue-400"
                />
                <StatCard
                  label="Routed Requests"
                  value={`${s?.routed_requests ?? 0}`}
                  sub={`${s?.total_input_tokens?.toLocaleString() ?? 0} input tokens`}
                  color="text-purple-400"
                />
              </div>

              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TrendChart data={dashboard?.trend ?? []} />
                <SavingsChart data={dashboard?.savings_breakdown ?? []} />
              </div>

              {/* Charts row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ModelBreakdown data={dashboard?.by_model ?? []} />
                {/* Top companies */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-gray-300 font-semibold mb-4">Top Companies by Spend</h3>
                  <div className="space-y-2">
                    {(dashboard?.top_companies ?? []).map((tc, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-2"
                            style={{ width: `${Math.min(100, (tc.cost / (dashboard?.top_companies[0]?.cost || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-300 text-sm w-32 truncate">{tc.company}</span>
                        <span className="text-gray-400 text-sm">${tc.cost.toFixed(4)}</span>
                      </div>
                    ))}
                    {(dashboard?.top_companies ?? []).length === 0 && (
                      <p className="text-gray-600 text-sm text-center py-4">No data yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Usage table */}
              <UsageTable records={usageRecords} />
            </div>
          )}

          {/* ── Companies ── */}
          {tab === "companies" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-white font-bold text-xl mb-1">Companies</h2>
                <p className="text-gray-500 text-sm">
                  Each company gets a unique <code className="text-indigo-400">X-Tracker-Key</code> header.
                  Pass it alongside your real AI provider key when calling the proxy endpoints.
                </p>
              </div>
              <CompanyManager companies={companies} onRefresh={loadAll} />
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
                <p className="font-semibold text-gray-300">How to use the proxy</p>
                <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">{`# OpenAI (replace base_url)
curl http://localhost:8000/proxy/openai/v1/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "X-Tracker-Key: <your-company-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'

# Anthropic
curl http://localhost:8000/proxy/anthropic/v1/messages \\
  -H "X-API-Key: $ANTHROPIC_API_KEY" \\
  -H "X-Tracker-Key: <your-company-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-sonnet-4-6","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'`}
                </pre>
              </div>
            </div>
          )}

          {/* ── Alerts ── */}
          {tab === "alerts" && (
            <div className="max-w-2xl space-y-4">
              <div>
                <h2 className="text-white font-bold text-xl mb-1">Budget Alerts</h2>
                <p className="text-gray-500 text-sm">
                  Configure spending thresholds per company. Alerts are flagged in the database when triggered.
                </p>
              </div>
              <AlertsPanel alerts={alerts} companies={companies} onRefresh={loadAll} />
            </div>
          )}

          {/* ── Pricing ── */}
          {tab === "pricing" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-white font-bold text-xl mb-1">Model Pricing Reference</h2>
                <p className="text-gray-500 text-sm">
                  Costs used for tracking. Model routing automatically downgrades to the cheapest tier for simple prompts.
                </p>
              </div>
              <PricingTable rows={pricing} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
