export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ deleted: 0 });
}
