const API = 'https://api.kamino.finance';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const EQUITIES = new Set(['NVDA', 'AAPL', 'GOOGL', 'TSLA', 'SPY', 'QQQ', 'MSTR']);

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
  borrowSymbol: 'USDC'; supplyApy: number; borrowApy: number;
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
export async function resolveLiveMarket(asset: string): Promise<LiveMarket | null> {
  if (!EQUITIES.has(asset)) return null;
  const listing = await kaminoJson('/markets/collateral-reserves');
  const rows: CollateralRow[] = Array.isArray(listing?.collateralReserves) ? listing.collateralReserves : [];
  const symbol = asset + 'x';
  const slug = `${symbol.toLowerCase()}-xstocks`;
  const candidates = rows.filter(row => row.slugs?.includes(slug) &&
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
    borrowMint: USDC_MINT, collateralSymbol: symbol, borrowSymbol: 'USDC',
    supplyApy, borrowApy, maxLtv, liquidationLtv, updatedAt: new Date().toISOString(),
  };
}

function send(req: any, res: any, status: number, body: { available: boolean; market?: LiveMarket; error?: string }) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  if (String(req.headers?.accept || '').includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html><html><head><title>Prisma market check</title></head><body><h1>${body.available ? 'Live market available' : body.error || 'Live market unavailable'}</h1></body></html>`);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(req, res, 405, { available: false, error: 'method_not_allowed' });
  if (req.query?.inspect === '1' && String(req.headers?.accept || '').includes('text/html')) {
    try {
      const listing = await kaminoJson('/markets/collateral-reserves');
      const rows = Array.isArray(listing) ? listing : listing?.collateralReserves;
      const collateral = rows?.find((row: any) => row.slugs?.includes('nvdax-xstocks'));
      const metrics = collateral?.lendingMarket ? await kaminoJson(`/kamino-market/${collateral.lendingMarket}/reserves/metrics`) : [];
      const reserves = Array.isArray(metrics) ? metrics : metrics?.reserves;
      const summary = {
        listingKeys: Object.keys(listing || {}).slice(0, 12), listingCount: rows?.length,
        sampleCollateral: collateral || rows?.[0],
        matchingCollateral: rows?.filter((row: any) => row.slugs?.some((slug: string) => slug.includes('nvdax'))).map((row: any) => ({
          name: row.name, lendingMarket: row.lendingMarket, lendingMarketName: row.lendingMarketName,
          debtTag: row.debtTag, slugs: row.slugs, collateralReserve: row.collateralReserve,
          collateralMint: row.collateralMint, borrowReserves: row.borrowReserves,
          borrowReserveTerms: row.borrowReserveTerms,
        })),
        metricsKeys: Object.keys(metrics || {}).slice(0, 12), metricsCount: reserves?.length,
        sampleMetric: reserves?.filter((row: any) => /nvdax?|usdc/i.test(row.liquidityToken || row.symbol || '')),
        eligibleBorrowMetrics: reserves?.filter((row: any) => collateral?.borrowReserves?.includes(row.reserve)),
      };
      const safe = JSON.stringify(summary, null, 2).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`<!doctype html><html><head><title>Market source shape</title></head><body><pre>${safe}</pre></body></html>`);
    } catch (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const safeMessage = String(error instanceof Error ? error.message : 'Unknown error').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      return res.end(`<!doctype html><html><body><h1>Market source error</h1><p>${safeMessage}</p></body></html>`);
    }
  }
  try {
    const market = await resolveLiveMarket(String(req.query?.asset || ''));
    if (!market) return send(req, res, 200, { available: false });
    return send(req, res, 200, { available: true, market });
  } catch {
    return send(req, res, 503, { available: false, error: 'live_market_unavailable' });
  }
}

