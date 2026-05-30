import { useState } from "react";
import { Trash2, Plus, Copy, Check } from "lucide-react";
import { Company, createCompany, deleteCompany } from "../api";

interface Props {
  companies: Company[];
  onRefresh: () => void;
}

export default function CompanyManager({ companies, onRefresh }: Props) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("100");
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");
    try {
      await createCompany(name.trim(), parseFloat(budget) || 100);
      setName("");
      setBudget("100");
      onRefresh();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to create company";
      setError(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this company and all its usage records?")) return;
    await deleteCompany(id);
    onRefresh();
  };

  const copyKey = (id: number, key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-gray-300 font-semibold mb-4">Company Management</h3>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          placeholder="Company name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
        />
        <input
          type="number"
          className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          placeholder="Budget $"
          value={budget}
          onChange={e => setBudget(e.target.value)}
        />
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <div className="space-y-2">
        {companies.map(c => (
          <div key={c.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 text-sm font-medium">{c.name}</p>
              <p className="text-gray-500 text-xs">Budget: ${c.budget_usd}/mo</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <code className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded max-w-[140px] truncate block">
                {c.api_key}
              </code>
              <button
                onClick={() => copyKey(c.id, c.api_key)}
                className="text-gray-500 hover:text-gray-300 transition"
                title="Copy API key"
              >
                {copied === c.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-gray-600 hover:text-red-400 transition"
                title="Delete company"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-4">No companies yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
