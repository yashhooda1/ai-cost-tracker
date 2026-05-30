import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; cost: number; savings: number }[];
}

export default function TrendChart({ data }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-gray-300 font-semibold mb-4">Daily Cost & Savings (USD)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }}
            formatter={(v: number) => [`$${v.toFixed(4)}`, undefined]}
          />
          <Legend />
          <Line type="monotone" dataKey="cost" stroke="#EF4444" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="savings" stroke="#10B981" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
