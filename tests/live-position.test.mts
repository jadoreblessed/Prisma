import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicKey } from '@solana/web3.js';
import handler, { obligationCount } from '../api/live-position.ts';

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
  { reserve: borrowReserve, liquidityToken: 'USDC', liquidityTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', supplyApy: '0.04', borrowApy: '0.08' },
];

function mockResponse() {
  let body = '';
  const headers = new Map<string, string>();
  return { headers, res: { statusCode: 200, setHeader: (key: string, value: string) => headers.set(key, value), end: (value: string) => { body = value; } },
    read: () => JSON.parse(body) };
}

test('obligationCount accepts documented list response shapes only', () => {
  assert.equal(obligationCount([]), 0);
  assert.equal(obligationCount([{ address: 'x' }]), 1);
  assert.equal(obligationCount({ obligations: [{ address: 'x' }] }), 1);
  assert.equal(obligationCount({ data: [] }), 0);
  assert.equal(obligationCount({ metadata: 'ok' }), null);
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

test('returns only the number of market obligation records, never their balances', async () => {
  const original = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input: any) => {
    const url = String(input);
    requested.push(url);
    if (url.includes('collateral-reserves')) return new Response(JSON.stringify(listing));
    if (url.includes('/reserves/metrics')) return new Response(JSON.stringify(metrics));
    return new Response(JSON.stringify([{ deposits: [{ amount: '999' }], borrows: [] }]));
  };
  const result = mockResponse();
  try {
    await handler({ method: 'GET', query: { asset: 'NVDA', wallet } }, result.res);
    const body = result.read();
    assert.equal(result.res.statusCode, 200);
    assert.equal(body.available, true);
    assert.equal(body.obligationCount, 1);
    assert.equal('deposits' in body, false);
    assert.match(requested[2], new RegExp(`/users/${wallet}/obligations\\?env=mainnet-beta$`));
  } finally { globalThis.fetch = original; }
});
