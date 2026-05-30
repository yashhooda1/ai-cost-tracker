import { PricingRow } from "../api";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-900 text-green-300",
  anthropic: "bg-orange-900 text-orange-300",
  google: "bg-blue-900 text-blue-300",
};

interface Props {
  rows: PricingRow[];
}

export default function PricingTable({ rows }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
      <h3 className="text-gray-300 font-semibold mb-4">Supported Models & Pricing (per 1M tokens)</h3>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4">Provider</th>
            <th className="pb-2 pr-4">Model</th>
            <th className="pb-2 pr-4 text-right">Input $</th>
            <th className="pb-2 text-right">Output $</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={`${r.provider}/${r.model}`} className="border-b border-gray-800/40 hover:bg-gray-800/20">
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${PROVIDER_COLORS[r.provider] ?? "bg-gray-700 text-gray-300"}`}>
                  {r.provider}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-300 font-mono text-xs">{r.model}</td>
              <td className="py-2 pr-4 text-right text-gray-400">${r.input_per_1m.toFixed(3)}</td>
              <td className="py-2 text-right text-gray-400">${r.output_per_1m.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
