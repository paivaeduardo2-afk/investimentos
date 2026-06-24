import { fetchMultipleB3Quotes } from "./shared.js";

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const tickersStr = req.query.tickers || "";
    const tickers = String(tickersStr)
      .split(",")
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0);

    const quotes = await fetchMultipleB3Quotes(tickers);
    res.status(200).json({ success: true, quotes });
  } catch (err: any) {
    console.error("Erro no serverless /api/b3/quotes:", err);
    res.status(500).json({ error: err.message || "Erro ao consultar as cotações." });
  }
}
