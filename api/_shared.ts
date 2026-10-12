import { markets as catalogue } from '../src/marketData';

export type ApiMarket = {
  id: string;
  collateral: string;
  borrowAsset: string;
  supplied: number;
  borrowed: number;
  supplyApy: number;
  borrowApy: number;
  priceAge: string;
  category: 'equity' | 'other';
  loanLimit: number;
};

export const markets: ApiMarket[] = (catalogue as unknown as Array<[string,string,number,number,number,number,string,'equity'|'other',number,string]>).map(row => ({
  collateral: row[0], borrowAsset: row[1], supplied: row[2], borrowed: row[3],
  supplyApy: row[4], borrowApy: row[5], priceAge: row[6], category: row[7],
  loanLimit: row[8], id: row[9],
}));

export function send(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=30, stale-while-revalidate=120' : 'no-store');
  return res.end(JSON.stringify(body));
}

export function bodyOf(req: any) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return req.body ?? null;
}
