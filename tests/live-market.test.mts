import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicKey } from '@solana/web3.js';
import { resolveLiveMarket } from '../api/_live-market.ts';

const market = 'CF32kn7AY8X1bW7ZkGcHc4X9ZWTxqKGCJk6QwrQkDcdw';
const collateralReserve = new PublicKey(new Uint8Array(32).fill(17)).toBase58();
const collateralMint = new PublicKey(new Uint8Array(32).fill(18)).toBase58();
const borrowReserve = new PublicKey(new Uint8Array(32).fill(19)).toBase58();
const usdc = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const listing = { collateralReserves: [{ name: 'NVIDIA xStock', lendingMarket: market,
  lendingMarketName: 'xStocks Market', collateralReserve, collateralMint,
  borrowReserves: [borrowReserve], borrowReserveTerms: [{ reserve: borrowReserve,
    maxLtv: '0.60', liquidationLtv: '0.70' }] }] };
const metrics = [
  { reserve: collateralReserve, liquidityToken: 'NVDAx', liquidityTokenMint: collateralMint },
  { reserve: borrowReserve, liquidityToken: 'USDC', liquidityTokenMint: usdc,
    supplyApy: '0.04', borrowApy: '0.08' },
];

test('only the independently matched xStocks collateral and USDC reserve become actionable', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url: any) => new Response(JSON.stringify(String(url).includes('collateral-reserves') ? listing : metrics));
  try {
    const live = await resolveLiveMarket('NVDA');
    assert.equal(live?.borrowReserve, borrowReserve);
    assert.equal(live?.collateralReserve, collateralReserve);
    assert.equal(live?.supplyApy, 4);
    assert.equal(live?.maxLtv, .6);
  } finally { globalThis.fetch = original; }
});

test('a missing borrow reserve disables the live flow', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url: any) => new Response(JSON.stringify(String(url).includes('collateral-reserves') ? listing : metrics.slice(0, 1)));
  try { assert.equal(await resolveLiveMarket('NVDA'), null); }
  finally { globalThis.fetch = original; }
});

test('a catalogue ticker without an explicit xStock mapping never reaches the upstream API', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('unexpected request'); };
  try { assert.equal(await resolveLiveMarket('CASHCAT'), null); }
  finally { globalThis.fetch = original; }
});
