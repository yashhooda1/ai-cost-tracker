import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  data: { model: string; cost: number }[];
}

export default function ModelBreakdown({ data }: Props) {
  const trimmed = data.map(d => ({ ...d, model: d.model.split("/").pop() ?? d.model }));
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-gray-300 font-semibold mb-4">Cost by Model (USD)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={trimmed} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <YAxis type="category" dataKey="model" width={160} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }}
            formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]}
          />
          <Bar dataKey="cost" fill="#6366F1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
