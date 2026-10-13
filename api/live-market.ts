import { send } from './_shared';
import { resolveLiveMarket } from './_live-market';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  try {
    const market = await resolveLiveMarket(String(req.query?.asset || ''));
    if (!market) return send(res, 200, { available: false });
    return send(res, 200, { available: true, market });
  } catch {
    return send(res, 503, { available: false, error: 'live_market_unavailable' });
  }
}
