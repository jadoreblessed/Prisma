import { bodyOf, markets, send } from './_shared';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const body = bodyOf(req);
  if (!body || !['lend','borrow'].includes(body.action)) return send(res, 400, { error: 'invalid_action' });
  const market = markets.find(m => m.id === body.marketId);
  const amount = Number(body.amount);
  if (!market) return send(res, 404, { error: 'market_not_found' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return send(res, 400, { error: 'invalid_amount' });

  if (body.action === 'lend') {
    const annualInterest = amount * market.supplyApy / 100;
    return send(res, 200, {
      action: 'lend', marketId: market.id, amount,
      asset: market.borrowAsset, apy: market.supplyApy,
      estimatedAnnualInterest: Number(annualInterest.toFixed(6)),
      executable: false, reason: 'contracts_not_configured',
    });
  }

  const maximumBorrow = amount * market.loanLimit / 100;
  const saferBorrow = maximumBorrow * 0.8;
  return send(res, 200, {
    action: 'borrow', marketId: market.id, collateralAmount: amount,
    collateralAsset: market.collateral, borrowAsset: market.borrowAsset,
    loanLimit: market.loanLimit,
    maximumBorrow: Number(maximumBorrow.toFixed(6)),
    saferBorrow: Number(saferBorrow.toFixed(6)),
    executable: false, reason: 'contracts_not_configured',
  });
}
