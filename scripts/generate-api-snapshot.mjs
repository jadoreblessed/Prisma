// Keep the serverless snapshot endpoints self-contained: Vercel runs each one
// independently, while the interactive catalogue is bundled by Vite.
import { writeFile } from 'node:fs/promises';
import { markets as catalogue } from '../src/marketData.ts';

const data = catalogue.map(([collateral, borrowAsset, supplied, borrowed, supplyApy, borrowApy, priceAge, category, loanLimit, id]) => ({
  id, collateral, borrowAsset, supplied, borrowed, supplyApy, borrowApy, priceAge, category, loanLimit,
}));
const snapshot = `const markets = ${JSON.stringify(data)};\n`;
const send = `function send(res: any, status: number, body: unknown) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); return res.end(JSON.stringify(body)); }\n`;
const marketsHandler = `const sortable = new Set(['supplied','borrowed','supplyApy','borrowApy','loanLimit']);
export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const category = String(req.query?.category ?? 'all');
  const search = String(req.query?.search ?? '').trim().toLowerCase().slice(0, 80);
  const sort = sortable.has(String(req.query?.sort)) ? String(req.query.sort) : 'supplied';
  const direction = String(req.query?.direction ?? 'desc') === 'asc' ? 1 : -1;
  const limit = Math.min(250, Math.max(1, Number(req.query?.limit) || 100));
  const offset = Math.max(0, Number(req.query?.offset) || 0);
  const rows = markets.filter(m => (category === 'all' || m.category === category) && (!search || (m.collateral + ' ' + m.borrowAsset).toLowerCase().includes(search)))
    .sort((a, b) => (Number(a[sort as keyof typeof a]) - Number(b[sort as keyof typeof b])) * direction);
  return send(res, 200, { rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
}\n`;
const quoteHandler = `export default function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'invalid_body' }); } }
  if (!body || !['lend','borrow'].includes(body.action)) return send(res, 400, { error: 'invalid_action' });
  const market = markets.find(m => m.id === body.marketId);
  const amount = Number(body.amount);
  if (!market) return send(res, 404, { error: 'market_not_found' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return send(res, 400, { error: 'invalid_amount' });
  if (body.action === 'lend') return send(res, 200, { action: 'lend', marketId: market.id, amount, asset: market.borrowAsset,
    apy: market.supplyApy, estimatedAnnualInterest: Number((amount * market.supplyApy / 100).toFixed(6)), executable: false, reason: 'illustrative_snapshot' });
  const maximumBorrow = amount * market.loanLimit / 100;
  return send(res, 200, { action: 'borrow', marketId: market.id, collateralAmount: amount, collateralAsset: market.collateral,
    borrowAsset: market.borrowAsset, loanLimit: market.loanLimit, maximumBorrow: Number(maximumBorrow.toFixed(6)),
    saferBorrow: Number((maximumBorrow * .8).toFixed(6)), executable: false, reason: 'illustrative_snapshot' });
}\n`;
for (const [name, handler] of [['markets', marketsHandler], ['quote', quoteHandler]]) {
  await writeFile(new URL(`../api/${name}.ts`, import.meta.url), `// @ts-nocheck\n// Generated from src/marketData.ts by scripts/generate-api-snapshot.mjs. Illustrative data only.\n${snapshot}${send}${handler}`);
}
