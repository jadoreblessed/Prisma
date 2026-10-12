import { markets, send } from './_shared';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const equity = markets.filter(m => m.category === 'equity');
  const other = markets.filter(m => m.category === 'other');
  return send(res, 200, {
    status: 'preview',
    network: null,
    contractsConfigured: false,
    marketCount: markets.length,
    equityAssets: equity.length,
    otherAssets: other.length,
    capabilities: { marketData: true, riskQuotes: true, walletRead: true, transactions: false },
  });
}
