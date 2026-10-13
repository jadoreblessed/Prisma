import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicKey } from '@solana/web3.js';
import handler, { positionsForMarket, suppliedUsdcForMarket } from '../api/live-position.ts';

const wallet = 'AcNSmd5CxwLs21TYUmhWt7CW2v159TdYRkvQxb1iBYRj';
const market = '5wJeMrUYECGq41fxRESKALVcHnNX26TAWy4W98yULsua';
const collateralReserve = new PublicKey(new Uint8Array(32).fill(17)).toBase58();
const collateralMint = new PublicKey(new Uint8Array(32).fill(18)).toBase58();
const borrowReserve = new PublicKey(new Uint8Array(32).fill(19)).toBase58();
const listing = { collateralReserves: [{ name: 'NVDAx Borrow Market', lendingMarket: market,
  lendingMarketName: 'xStocks Pool', debtTag: 'stables', slugs: ['nvdax-stables'], collateralReserve, collateralMint,
  borrowReserves: [borrowReserve], borrowReserveTerms: [{ reserve: borrowReserve, maxLtv: '0.60', liquidationLtv: '0.70' }] }] };
const metrics = [
  { reserve: collateralReserve, liquidityToken: 'NVDAx', liquidityTokenMint: collateralMint },
  { reserve: borrowReserve, liquidityToken: 'USDC', liquidityTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
];

function mockResponse() {
  let body = '';
  const headers = new Map<string, string>();
  return { headers, res: { statusCode: 200, setHeader: (key: string, value: string) => headers.set(key, value), end: (value: string) => { body = value; } },
    read: () => JSON.parse(body) };
}

test('portfolio parser returns only positions for the resolved market and sanitizes amounts', () => {
  const otherCollateralMint = new PublicKey(new Uint8Array(32).fill(20)).toBase58();
  const result = positionsForMarket({ lending: [
    { market, netValue: '980.5', totalDepositValue: '1000', totalBorrowValue: '19.5', ltv: '0.0195',
      deposits: [{ mint: collateralMint, symbol: 'NVDAx', amount: '2', value: '1000', price: '500' },
        { mint: otherCollateralMint, symbol: 'SPYx', amount: '5', value: '2500', price: '500' }],
      borrows: [{ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: '19.5', value: 19.5 }] },
    { market, netValue: '900', deposits: [{ mint: otherCollateralMint, symbol: 'SPYx', amount: '5' }], borrows: [
      { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: '50' }] },
    { market: collateralReserve, netValue: '900', deposits: [], borrows: [] },
  ] }, market, collateralMint, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  assert.equal(result.length, 1);
  assert.equal(result[0].netValue, 980.5);
  assert.equal(result[0].deposits.length, 1);
  assert.deepEqual(result[0].deposits[0], { mint: collateralMint, symbol: 'NVDAx', amount: '2', value: 1000, price: 500 });
  assert.equal(result[0].borrows[0].value, 19.5);
});

test('invalid public keys are rejected before any upstream request', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('unexpected request'); };
  const result = mockResponse();
  try {
    await handler({ method: 'GET', query: { asset: 'NVDA', wallet: 'not-a-wallet' } }, result.res);
    assert.equal(result.res.statusCode, 400);
    assert.equal(result.read().error, 'invalid_asset_or_wallet');
  } finally { globalThis.fetch = original; }
});

test('USDC-only supply is visible without attributing it to a particular xStock', () => {
  const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const portfolio = { lending: [
    { market, deposits: [{ mint, symbol: 'USDC', amount: '5', value: 5 }] },
    { market: collateralReserve, deposits: [{ mint, symbol: 'USDC', amount: '999', value: 999 }] },
  ] };
  assert.equal(positionsForMarket(portfolio, market, collateralMint, mint).length, 0);
  assert.deepEqual(suppliedUsdcForMarket(portfolio, market).map(row => row.amount), ['5']);
});

test('position route resolves the market and requests the wallet portfolio read-only', async () => {
  const original = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input: any) => {
    const url = String(input);
    requested.push(url);
    if (url.includes('collateral-reserves')) return new Response(JSON.stringify(listing));
    if (url.includes('/reserves/metrics')) return new Response(JSON.stringify(metrics));
    return new Response(JSON.stringify({ lending: [{ market, netValue: 980, totalDepositValue: 1000, totalBorrowValue: 20,
      ltv: 0.02, deposits: [{ mint: collateralMint, symbol: 'NVDAx', amount: '2', value: 1000 }],
      borrows: [{ mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', amount: '20', value: 20 }] }] }));
  };
  const result = mockResponse();
  try {
    await handler({ method: 'GET', query: { asset: 'NVDA', wallet } }, result.res);
    const body = result.read();
    assert.equal(result.res.statusCode, 200);
    assert.equal(body.available, true);
    assert.equal(body.positions.length, 1);
    assert.equal(body.positions[0].totalDepositValue, 1000);
    assert.match(requested[2], new RegExp(`/portfolio/${wallet}\\?env=mainnet-beta$`));
  } finally { globalThis.fetch = original; }
});
