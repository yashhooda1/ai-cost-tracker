import { buildUsage } from "./_demo.js";
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(buildUsage());
}
