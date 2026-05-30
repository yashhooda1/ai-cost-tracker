import { UsageRecord } from "../api";

interface Props {
  records: UsageRecord[];
}

const badge = (text: string, color: string) => (
  <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{text}</span>
);

export default function UsageTable({ records }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
      <h3 className="text-gray-300 font-semibold mb-4">Recent Requests</h3>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-3">Company</th>
            <th className="pb-2 pr-3">Provider</th>
            <th className="pb-2 pr-3">Model</th>
            <th className="pb-2 pr-3 text-right">Tokens In</th>
            <th className="pb-2 pr-3 text-right">Tokens Out</th>
            <th className="pb-2 pr-3 text-right">Cost</th>
            <th className="pb-2 pr-3 text-right">Saved</th>
            <th className="pb-2 pr-3">Flags</th>
            <th className="pb-2">Latency</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 pr-3 text-gray-300">{r.company}</td>
              <td className="py-2 pr-3 text-gray-400 capitalize">{r.provider}</td>
              <td className="py-2 pr-3 text-gray-400 text-xs max-w-[140px] truncate" title={r.model}>{r.model}</td>
              <td className="py-2 pr-3 text-right text-gray-400">{r.input_tokens.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right text-gray-400">{r.output_tokens.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right text-red-400">${r.cost_usd.toFixed(5)}</td>
              <td className="py-2 pr-3 text-right text-emerald-400">${r.savings_usd.toFixed(5)}</td>
              <td className="py-2 pr-3 space-x-1">
                {r.cache_hit && badge("Cache", "bg-blue-900 text-blue-300")}
                {r.routed_from && badge("Routed", "bg-purple-900 text-purple-300")}
              </td>
              <td className="py-2 text-gray-500">{r.latency_ms ? `${r.latency_ms}ms` : "—"}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center text-gray-600">
                No requests yet. Send your first proxied API call to see data here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
