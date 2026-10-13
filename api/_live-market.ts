const API = 'https://api.kamino.finance';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDG_MINT = '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH';
export const LIVE_ASSETS = new Set(['NVDA', 'AAPL', 'GOOGL', 'TSLA', 'SPY', 'QQQ', 'MSTR', 'CRCL', 'HOOD', 'cbBTC']);
export type BorrowAsset = 'USDC' | 'USDG';

type CollateralRow = {
  name?: string; lendingMarket?: string; lendingMarketName?: string;
  collateralReserve?: string; collateralMint?: string; borrowReserves?: string[];
  debtTag?: string; slugs?: string[];
  borrowReserveTerms?: { reserve: string; maxLtv: string; liquidationLtv: string }[];
};
type ReserveMetric = {
  reserve: string; liquidityToken: string; liquidityTokenMint: string;
  supplyApy: string; borrowApy: string; totalSupply: string; totalBorrow: string;
};

export type LiveMarket = {
  asset: string;
  market: string; collateralReserve: string; collateralMint: string;
  borrowReserve: string; borrowMint: string; collateralSymbol: string;
  borrowSymbol: BorrowAsset; supplyApy: number; borrowApy: number;
  maxLtv: number; liquidationLtv: number; updatedAt: string;
};

function validAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false;
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = [0];
  for (const char of value) {
    let carry = alphabet.indexOf(char);
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

async function kaminoJson(path: string): Promise<any> {
  const response = await fetch(API + path, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Upstream market service: ${response.status}`);
  return response.json();
}

// The old catalogue is a visual snapshot. Verify every xStock against reserve metrics.
// Never infer an onchain reserve merely from a ticker in that catalogue.
export async function resolveLiveMarket(asset: string, borrowAsset: BorrowAsset = 'USDC'): Promise<LiveMarket | null> {
  if (!LIVE_ASSETS.has(asset) || (borrowAsset !== 'USDC' && borrowAsset !== 'USDG')) return null;
  const listing = await kaminoJson('/markets/collateral-reserves');
  const rows: CollateralRow[] = Array.isArray(listing?.collateralReserves) ? listing.collateralReserves : [];
  const symbol = asset === 'cbBTC' ? asset : asset + 'x';
  const slug = asset === 'cbBTC' ? 'cbbtc-stables-xstocks' : `${symbol.toLowerCase()}-stables`;
  const candidates = rows.filter(row => row.slugs?.includes(slug) && row.debtTag === 'stables' &&
    /xstocks/i.test(row.lendingMarketName || '') && row.name?.startsWith(symbol + ' ') &&
    validAddress(row.lendingMarket) && validAddress(row.collateralReserve) && validAddress(row.collateralMint));
  const market = candidates[0]?.lendingMarket;
  if (!market) return null;
  const metrics = await kaminoJson(`/kamino-market/${market}/reserves/metrics`);
  const reserves: ReserveMetric[] = Array.isArray(metrics) ? metrics : [];
  const borrowMint = borrowAsset === 'USDC' ? USDC_MINT : USDG_MINT;
  const debt = reserves.find(row => row.liquidityTokenMint === borrowMint && row.liquidityToken === borrowAsset);
  const collateral = candidates.find(row => row.lendingMarket === market &&
    row.borrowReserves?.includes(debt?.reserve || '') &&
    row.borrowReserveTerms?.some(term => term.reserve === debt?.reserve));
  if (!collateral || !validAddress(collateral.lendingMarket) ||
      !validAddress(collateral.collateralReserve) || !validAddress(collateral.collateralMint)) return null;
  const backing = reserves.find(row => row.reserve === collateral.collateralReserve &&
    row.liquidityTokenMint === collateral.collateralMint && row.liquidityToken === symbol);
  const terms = collateral.borrowReserveTerms?.find(row => row.reserve === debt?.reserve);
  if (!backing || !debt || !terms || !validAddress(debt.reserve)) return null;
  const maxLtv = Number(terms.maxLtv), liquidationLtv = Number(terms.liquidationLtv);
  const supplyApy = Number(debt.supplyApy) * 100, borrowApy = Number(debt.borrowApy) * 100;
  if (![maxLtv, liquidationLtv, supplyApy, borrowApy].every(Number.isFinite) ||
      maxLtv <= 0 || maxLtv >= liquidationLtv || liquidationLtv > 1 ||
      supplyApy < 0 || borrowApy < 0) return null;
  return {
    asset,
    market: collateral.lendingMarket, collateralReserve: collateral.collateralReserve,
    collateralMint: collateral.collateralMint, borrowReserve: debt.reserve,
    borrowMint, collateralSymbol: symbol, borrowSymbol: borrowAsset,
    supplyApy, borrowApy, maxLtv, liquidationLtv, updatedAt: new Date().toISOString(),
  };
}

