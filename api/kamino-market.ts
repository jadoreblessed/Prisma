import { send } from './_shared';

type CollateralReserve = {
  name?: string;
  lendingMarket?: string;
  lendingMarketName?: string;
  collateralReserve?: string;
  collateralMint?: string;
  borrowReserves?: string[];
};

const KAMINO_API = 'https://api.kamino.finance/markets/collateral-reserves';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  try {
    const response = await fetch(KAMINO_API, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Kamino returned ${response.status}`);
    const data = await response.json() as { collateralReserves?: CollateralReserve[] };
    const reserve = data.collateralReserves?.find(row =>
      /\b(?:nvdax?|nvidia)\b/i.test(row.name?.trim() || '') &&
      /xstocks/i.test(row.lendingMarketName || '') &&
      row.lendingMarket && row.collateralReserve && row.collateralMint && row.borrowReserves?.length,
    );
    if (!reserve) return send(res, 200, { available: false, provider: 'Kamino', updatedAt: new Date().toISOString() });
    return send(res, 200, {
      available: true,
      provider: 'Kamino',
      asset: 'NVDAx',
      marketName: reserve.lendingMarketName,
      marketAddress: reserve.lendingMarket,
      collateralReserve: reserve.collateralReserve,
      url: `https://kamino.com/borrow/?asset=${encodeURIComponent(reserve.collateralMint!)}&market=${encodeURIComponent(reserve.lendingMarket!)}&reserve=${encodeURIComponent(reserve.collateralReserve!)}`,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return send(res, 503, { available: false, error: 'kamino_unavailable' });
  }
}
