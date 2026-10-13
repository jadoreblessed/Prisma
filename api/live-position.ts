const API = 'https://api.kamino.finance';
const EQUITIES = new Set(['NVDA', 'AAPL', 'GOOGL', 'TSLA', 'SPY', 'QQQ', 'MSTR']);
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

type CollateralRow = {
  name?: string; lendingMarket?: string; lendingMarketName?: string;
  collateralReserve?: string; collateralMint?: string; borrowReserves?: string[];
  debtTag?: string; slugs?: string[];
  borrowReserveTerms?: { reserve: string; maxLtv: string; liquidationLtv: string }[];
};
type ReserveMetric = { reserve: string; liquidityToken: string; liquidityTokenMint: string };
type ResolvedMarket = { market: string; collateralReserve: string; collateralMint: string; borrowReserve: string };
type PortfolioAsset = { mint: string; symbol: string; amount: string; value: number | null; price: number | null };
type PortfolioPosition = {
  netValue: number | null; totalDepositValue: number | null; totalBorrowValue: number | null;
  ltv: number | null; maxLtv: number | null; liquidationLtv: number | null;
  deposits: PortfolioAsset[]; borrows: PortfolioAsset[];
};

function validAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false;
  const bytes = [0];
  for (const char of value) {
    let carry = ALPHABET.indexOf(char);
    if (carry < 0) return false;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 255); carry >>= 8; }
  }
  const leadingZeroes = value.match(/^1*/)?.[0].length || 0;
  return (bytes.length === 1 && bytes[0] === 0 ? 0 : bytes.length) + leadingZeroes === 32;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanAssets(value: unknown): PortfolioAsset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: any) => {
    if (!item || typeof item !== 'object' || !validAddress(item.mint) ||
        typeof item.symbol !== 'string' || typeof item.amount !== 'string') return [];
    return [{ mint: item.mint, symbol: item.symbol.slice(0, 16), amount: item.amount.slice(0, 48),
      value: numberOrNull(item.value), price: numberOrNull(item.price) }];
  });
}

// Kamino's public portfolio includes lending positions across markets. Expose
// only the selected Prisma market and a small, validated subset of its fields.
export function positionsForMarket(payload: unknown, market: string, collateralMint: string, borrowMint: string): PortfolioPosition[] {
  if (!payload || typeof payload !== 'object' || !validAddress(market) ||
      !validAddress(collateralMint) || !validAddress(borrowMint)) return [];
  const portfolio = payload as Record<string, any>;
  const rows = Array.isArray(portfolio.lending) ? portfolio.lending
    : Array.isArray(portfolio.positions?.lending) ? portfolio.positions.lending : [];
  return rows.flatMap((row: any) => {
    if (!row || row.market !== market) return [];
    const deposits = cleanAssets(row.deposits).filter(asset => asset.mint === collateralMint);
    // Only show a debt row when the selected xStock is actually posted as collateral.
    // Kamino markets can contain multiple reserves, so matching the market address
    // alone can otherwise attribute another asset's USDC debt to this selection.
    if (!deposits.length) return [];
    const borrows = cleanAssets(row.borrows).filter(asset => asset.mint === borrowMint);
    return [{
      netValue: numberOrNull(row.netValue), totalDepositValue: numberOrNull(row.totalDepositValue),
      totalBorrowValue: numberOrNull(row.totalBorrowValue), ltv: numberOrNull(row.ltv),
      maxLtv: numberOrNull(row.maxLtv), liquidationLtv: numberOrNull(row.liquidationLtv), deposits, borrows,
    }];
  });
}

export function suppliedUsdcForMarket(payload: unknown, market: string): PortfolioAsset[] {
  if (!payload || typeof payload !== 'object' || !validAddress(market)) return [];
  const portfolio = payload as Record<string, any>;
  const rows = Array.isArray(portfolio.lending) ? portfolio.lending
    : Array.isArray(portfolio.positions?.lending) ? portfolio.positions.lending : [];
  return rows.flatMap((row: any) => row?.market === market ?
    cleanAssets(row.deposits).filter(item => item.mint === USDC_MINT) : []);
}

async function kaminoJson(path: string): Promise<any> {
  const response = await fetch(API + path, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Upstream market service: ${response.status}`);
  return response.json();
}

async function resolveLiveMarket(asset: string): Promise<ResolvedMarket | null> {
  if (!EQUITIES.has(asset)) return null;
  const listing = await kaminoJson('/markets/collateral-reserves');
  const rows: CollateralRow[] = Array.isArray(listing?.collateralReserves) ? listing.collateralReserves : [];
  const symbol = asset + 'x';
  const slug = `${symbol.toLowerCase()}-stables`;
  const candidates = rows.filter(row => row.slugs?.includes(slug) && row.debtTag === 'stables' &&
    /xstocks/i.test(row.lendingMarketName || '') && row.name?.startsWith(symbol + ' ') &&
    validAddress(row.lendingMarket) && validAddress(row.collateralReserve) && validAddress(row.collateralMint));
  const market = candidates[0]?.lendingMarket;
  if (!market) return null;
  const metrics = await kaminoJson(`/kamino-market/${market}/reserves/metrics`);
  const reserves: ReserveMetric[] = Array.isArray(metrics) ? metrics : [];
  const debt = reserves.find(row => row.liquidityTokenMint === USDC_MINT && row.liquidityToken === 'USDC');
  const collateral = candidates.find(row => row.lendingMarket === market &&
    row.borrowReserves?.includes(debt?.reserve || '') &&
    row.borrowReserveTerms?.some(term => term.reserve === debt?.reserve));
  if (!collateral || !debt || !validAddress(debt.reserve) ||
      !validAddress(collateral.collateralReserve) || !validAddress(collateral.collateralMint)) return null;
  const backing = reserves.find(row => row.reserve === collateral.collateralReserve &&
    row.liquidityTokenMint === collateral.collateralMint && row.liquidityToken === symbol);
  if (!backing) return null;
  return { market, collateralReserve: collateral.collateralReserve, collateralMint: collateral.collateralMint, borrowReserve: debt.reserve };
}

function send(res: any, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { available: false, error: 'method_not_allowed' });
  const asset = String(req.query?.asset || '');
  const wallet = String(req.query?.wallet || '');
  if (!EQUITIES.has(asset) || !validAddress(wallet)) {
    return send(res, 400, { available: false, error: 'invalid_asset_or_wallet' });
  }

  try {
    const market = await resolveLiveMarket(asset);
    if (!market) return send(res, 200, { available: false, positions: [] });
    const payload = await kaminoJson(`/portfolio/${encodeURIComponent(wallet)}?env=mainnet-beta`);
    const positions = positionsForMarket(payload, market.market, market.collateralMint, USDC_MINT);
    const supplies = suppliedUsdcForMarket(payload, market.market);
    return send(res, 200, { available: true, market: market.market, positions, supplies, checkedAt: new Date().toISOString() });
  } catch {
    return send(res, 503, { available: false, error: 'live_position_unavailable' });
  }
}
