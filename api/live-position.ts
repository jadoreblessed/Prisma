const API = 'https://api.kamino.finance';
const EQUITIES = new Set(['NVDA', 'AAPL', 'GOOGL', 'TSLA', 'SPY', 'QQQ', 'MSTR']);
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

type CollateralRow = {
  name?: string; lendingMarket?: string; lendingMarketName?: string;
  collateralReserve?: string; collateralMint?: string; borrowReserves?: string[];
  debtTag?: string; slugs?: string[];
  borrowReserveTerms?: { reserve: string; maxLtv: string; liquidationLtv: string }[];
};
type ReserveMetric = {
  reserve: string; liquidityToken: string; liquidityTokenMint: string;
  supplyApy: string; borrowApy: string;
};
type LiveMarket = { market: string };

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

async function kaminoJson(path: string): Promise<any> {
  const response = await fetch(API + path, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Upstream market service: ${response.status}`);
  return response.json();
}

// Resolve the actual Kamino xStocks + USDC market from live metadata rather than
// trusting a ticker or a market address supplied by the browser.
async function resolveLiveMarket(asset: string): Promise<LiveMarket | null> {
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
  const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const debt = reserves.find(row => row.liquidityTokenMint === usdcMint && row.liquidityToken === 'USDC');
  const collateral = candidates.find(row => row.lendingMarket === market &&
    row.borrowReserves?.includes(debt?.reserve || '') &&
    row.borrowReserveTerms?.some(term => term.reserve === debt?.reserve));
  if (!collateral || !debt || !validAddress(debt.reserve) ||
      !validAddress(collateral.collateralReserve) || !validAddress(collateral.collateralMint)) return null;
  const backing = reserves.find(row => row.reserve === collateral.collateralReserve &&
    row.liquidityTokenMint === collateral.collateralMint && row.liquidityToken === symbol);
  if (!backing) return null;
  return { market };
}

export function obligationCount(payload: unknown): number | null {
  if (Array.isArray(payload)) return payload.length;
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['obligations', 'data', 'loans']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).length;
  }
  return null;
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
    if (!market) return send(res, 200, { available: false });
    const url = `${API}/kamino-market/${encodeURIComponent(market.market)}/users/${encodeURIComponent(wallet)}/obligations?env=mainnet-beta`;
    const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error(`Kamino API ${response.status}`);
    const count = obligationCount(await response.json());
    if (count === null) throw new Error('Unexpected Kamino obligations response');
    return send(res, 200, { available: true, obligationCount: count, checkedAt: new Date().toISOString() });
  } catch {
    return send(res, 503, { available: false, error: 'live_position_unavailable' });
  }
}
