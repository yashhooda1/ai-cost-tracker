import { COMPANIES } from "./_demo.js";
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "POST") {
    return res.json({ id: 99, name: req.body?.name ?? "Demo Co", api_key: "demo-readonly-key", budget_usd: 100, created_at: new Date().toISOString() });
  }
  res.json(COMPANIES);
}
