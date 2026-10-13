import { markets, send } from './_shared.ts';

const sortable = new Set(['supplied','borrowed','supplyApy','borrowApy','loanLimit']);

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const category = String(req.query?.category ?? 'all');
  const search = String(req.query?.search ?? '').trim().toLowerCase().slice(0, 80);
  const sort = sortable.has(String(req.query?.sort)) ? String(req.query.sort) as keyof typeof markets[number] : 'supplied';
  const direction = String(req.query?.direction ?? 'desc') === 'asc' ? 1 : -1;
  const limit = Math.min(250, Math.max(1, Number(req.query?.limit) || 100));
  const offset = Math.max(0, Number(req.query?.offset) || 0);
  const rows = markets
    .filter(m => (category === 'all' || m.category === category) && (!search || `${m.collateral} ${m.borrowAsset}`.toLowerCase().includes(search)))
    .sort((a, b) => (Number(a[sort]) - Number(b[sort])) * direction);
  return send(res, 200, { rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
}
