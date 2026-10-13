import { CATALOGUE_ASSETS } from './_asset-universe.ts';
import { resolveLiveMarket, type BorrowAsset } from './_live-market.ts';
const API = 'https://api.kamino.finance';
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
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

export function suppliedForMarket(payload: unknown, market: string, borrowMint: string): PortfolioAsset[] {
  if (!payload || typeof payload !== 'object' || !validAddress(market) || !validAddress(borrowMint)) return [];
  const portfolio = payload as Record<string, any>;
  const rows = Array.isArray(portfolio.lending) ? portfolio.lending
    : Array.isArray(portfolio.positions?.lending) ? portfolio.positions.lending : [];
  return rows.flatMap((row: any) => row?.market === market ?
    cleanAssets(row.deposits).filter(item => item.mint === borrowMint) : []);
}
export const suppliedUsdcForMarket = (payload: unknown, market: string) => suppliedForMarket(payload, market, USDC_MINT);

async function kaminoJson(path: string): Promise<any> {
  const response = await fetch(API + path, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Upstream market service: ${response.status}`);
  return response.json();
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
  const borrowAsset = String(req.query?.borrowAsset || 'USDC');
  const wallet = String(req.query?.wallet || '');
  if (!CATALOGUE_ASSETS.has(asset) || (borrowAsset !== 'USDC' && borrowAsset !== 'USDG') || !validAddress(wallet)) {
    return send(res, 400, { available: false, error: 'invalid_asset_or_wallet' });
  }

  try {
    const market = await resolveLiveMarket(asset, borrowAsset as BorrowAsset);
    if (!market) return send(res, 200, { available: false, positions: [] });
    const payload = await kaminoJson(`/portfolio/${encodeURIComponent(wallet)}?env=mainnet-beta`);
    const positions = positionsForMarket(payload, market.market, market.collateralMint, market.borrowMint);
    const supplies = suppliedForMarket(payload, market.market, market.borrowMint);
    return send(res, 200, { available: true, market: market.market, positions, supplies, checkedAt: new Date().toISOString() });
  } catch {
    return send(res, 503, { available: false, error: 'live_position_unavailable' });
  }
}
