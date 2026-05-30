import { useState } from "react";
import { Bell, Trash2, Plus } from "lucide-react";
import { Alert, Company, createAlert, deleteAlert } from "../api";

interface Props {
  alerts: Alert[];
  companies: Company[];
  onRefresh: () => void;
}

export default function AlertsPanel({ alerts, companies, onRefresh }: Props) {
  const [companyId, setCompanyId] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [period, setPeriod] = useState("monthly");

  const handleCreate = async () => {
    if (!companyId) return;
    await createAlert(parseInt(companyId), parseFloat(threshold) || 10, period);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await deleteAlert(id);
    onRefresh();
  };

  const companyName = (id: number) => companies.find(c => c.id === id)?.name ?? `#${id}`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-gray-300 font-semibold mb-4 flex items-center gap-2">
        <Bell size={16} /> Budget Alerts
      </h3>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
        >
          <option value="">Select company</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="number"
          className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          placeholder="$ threshold"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
        />
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          value={period}
          onChange={e => setPeriod(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={14} /> Add Alert
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${a.triggered ? "bg-red-900/30 border border-red-800" : "bg-gray-800/50"}`}>
            <div className="flex-1">
              <p className="text-gray-200 text-sm">
                <span className="font-medium">{companyName(a.company_id)}</span>
                {" — alert at "}
                <span className="text-amber-400">${a.threshold_usd}</span>
                {" "}
                <span className="text-gray-500">({a.period})</span>
              </p>
              {a.triggered && (
                <p className="text-red-400 text-xs">Triggered {a.triggered_at}</p>
              )}
            </div>
            <button onClick={() => handleDelete(a.id)} className="text-gray-600 hover:text-red-400 transition">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-4">No alerts configured.</p>
        )}
      </div>
    </div>
  );
}
