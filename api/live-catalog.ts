import { discoverLiveAssets } from './_live-market.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('{"error":"method_not_allowed"}'); }
  try {
    const rows = await discoverLiveAssets();
    return res.end(JSON.stringify({ rows, checkedAt: new Date().toISOString() }));
  } catch {
    res.statusCode = 503;
    return res.end('{"error":"live_catalog_unavailable"}');
  }
}
