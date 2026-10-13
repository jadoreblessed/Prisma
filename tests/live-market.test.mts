import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicKey } from '@solana/web3.js';
import { resolveLiveMarket } from '../api/live-market.ts';
import { discoverLiveAssets } from '../api/_live-market.ts';

const market = '5wJeMrUYECGq41fxRESKALVcHnNX26TAWy4W98yULsua';
const collateralReserve = new PublicKey(new Uint8Array(32).fill(17)).toBase58();
const collateralMint = new PublicKey(new Uint8Array(32).fill(18)).toBase58();
const borrowReserve = new PublicKey(new Uint8Array(32).fill(19)).toBase58();
const usdc = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const usdg = '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH';
const usdgReserve = new PublicKey(new Uint8Array(32).fill(21)).toBase58();
const listing = { collateralReserves: [{ name: 'NVDAx Borrow Market', lendingMarket: market,
  lendingMarketName: 'xStocks Pool', debtTag: 'stables', slugs: ['nvdax-stables'], collateralReserve, collateralMint,
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

test('selects the explicit USDC pair when the same collateral also has equity debt pairs', async () => {
  const original = globalThis.fetch;
  const equityOnly = { ...listing.collateralReserves[0], debtTag: 'xstocks', slugs: ['nvdax-xstocks'], borrowReserves: [collateralReserve],
    borrowReserveTerms: [{ reserve: collateralReserve, maxLtv: '0.45', liquidationLtv: '0.55' }] };
  const pairs = { collateralReserves: [equityOnly, listing.collateralReserves[0]] };
  globalThis.fetch = async (url: any) => new Response(JSON.stringify(String(url).includes('collateral-reserves') ? pairs : metrics));
  try { assert.equal((await resolveLiveMarket('NVDA'))?.borrowReserve, borrowReserve); }
  finally { globalThis.fetch = original; }
});

test('a catalogue ticker without an explicit xStock mapping never reaches the upstream API', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('unexpected request'); };
  try { assert.equal(await resolveLiveMarket('CASHCAT'), null); }
  finally { globalThis.fetch = original; }
});

test('CRCL can borrow the verified Solana USDG reserve, but not an unrelated token', async () => {
  const original = globalThis.fetch;
  const crcl = { ...listing.collateralReserves[0], name: 'CRCLx Borrow Market', slugs: ['crclx-stables'],
    borrowReserves: [usdgReserve], borrowReserveTerms: [{ reserve: usdgReserve, maxLtv: '0.3', liquidationLtv: '0.4' }] };
  const reserves = [{ ...metrics[0], liquidityToken: 'CRCLx' },
    { ...metrics[1], reserve: usdgReserve, liquidityToken: 'USDG', liquidityTokenMint: usdg }];
  globalThis.fetch = async (url: any) => new Response(JSON.stringify(String(url).includes('collateral-reserves') ? { collateralReserves: [crcl] } : reserves));
  try {
    assert.equal((await resolveLiveMarket('CRCL', 'USDG'))?.borrowMint, usdg);
    assert.equal(await resolveLiveMarket('CRCL', 'USDC'), null);
  } finally { globalThis.fetch = original; }
});

test('cbBTC requires its own collateral slug and exact mint', async () => {
  const original = globalThis.fetch;
  const bitcoin = { ...listing.collateralReserves[0], name: 'cbBTC Borrow Market',
    slugs: ['cbbtc-stables-xstocks'] };
  const reserves = [{ ...metrics[0], liquidityToken: 'cbBTC' }, metrics[1]];
  globalThis.fetch = async (url: any) => new Response(JSON.stringify(String(url).includes('collateral-reserves') ? { collateralReserves: [bitcoin] } : reserves));
  try { assert.equal((await resolveLiveMarket('cbBTC'))?.collateralSymbol, 'cbBTC'); }
  finally { globalThis.fetch = original; }
});

test('new catalogue xStocks appear automatically only with matching debt and collateral reserves', async () => {
  const original = globalThis.fetch;
  const crwv = { ...listing.collateralReserves[0], name: 'CRWVx Borrow Market', slugs: ['crwvx-stables'] };
  const rows = { collateralReserves: [listing.collateralReserves[0], crwv] };
  const verified = [...metrics, { ...metrics[0], liquidityToken: 'CRWVx',
    liquidityTokenMint: new PublicKey(new Uint8Array(32).fill(22)).toBase58(),
    reserve: new PublicKey(new Uint8Array(32).fill(23)).toBase58() }];
  crwv.collateralMint = verified[2].liquidityTokenMint;
  crwv.collateralReserve = verified[2].reserve;
  globalThis.fetch = async (url: any) => new Response(JSON.stringify(String(url).includes('collateral-reserves') ? rows : verified));
  try {
    const discovered = await discoverLiveAssets();
    assert.deepEqual(discovered.find(item => item.asset === 'CRWV')?.borrowAssets, ['USDC']);
    assert.equal((await resolveLiveMarket('CRWV'))?.collateralMint, crwv.collateralMint);
    crwv.borrowReserves = [];
    assert.equal(await resolveLiveMarket('CRWV'), null);
  } finally { globalThis.fetch = original; }
});
