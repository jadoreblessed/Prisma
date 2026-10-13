export default function handler(_req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ rows: [{ id: 'diagnostic', collateral: 'NVDA', borrowAsset: 'USDC', supplied: 1, borrowed: 0, supplyApy: 0, borrowApy: 0, priceAge: '—', category: 'equity', loanLimit: 0 }], total: 1 }));
}
