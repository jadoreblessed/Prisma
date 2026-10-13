import { resolveLiveMarket } from './_live-market.ts';

function send(req: any, res: any, status: number, body: { available: boolean; market?: unknown; error?: string }) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  if (String(req.headers?.accept || '').includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html><html><head><title>Prisma market check</title></head><body><h1>${body.available ? 'Live market available' : body.error || 'Live market unavailable'}</h1></body></html>`);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(req, res, 405, { available: false, error: 'method_not_allowed' });
  try {
    const market = await resolveLiveMarket(String(req.query?.asset || ''));
    if (!market) return send(req, res, 200, { available: false });
    return send(req, res, 200, { available: true, market });
  } catch {
    return send(req, res, 503, { available: false, error: 'live_market_unavailable' });
  }
}
