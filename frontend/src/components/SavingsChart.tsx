import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#10B981", "#6366F1", "#F59E0B", "#EF4444"];

interface Props {
  data: { name: string; value: number }[];
}

export default function SavingsChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-gray-300 font-semibold mb-1">Savings Breakdown (USD)</h3>
      <p className="text-gray-500 text-xs mb-3">Total saved: ${total.toFixed(4)}</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }}
            formatter={(v: number) => [`$${v.toFixed(4)}`, undefined]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
