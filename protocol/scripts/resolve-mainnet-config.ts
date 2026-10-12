import { Connection, PublicKey } from '@solana/web3.js';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const rpc = process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const CHAINLINK = new PublicKey('HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny');
const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

type Config = Record<string, unknown> & { collateralMint: string; borrowMint: string; chainlinkFeed: string; paused: boolean; supplyCapBaseUnits: string; borrowCapBaseUnits: string };
const template = JSON.parse(await readFile(resolve(root, 'mainnet/market.example.json'), 'utf8')) as Config;
const connection = new Connection(rpc, 'confirmed');
const genesis = await connection.getGenesisHash();
if (genesis !== MAINNET_GENESIS) throw new Error(`Refusing non-mainnet RPC. Genesis: ${genesis}`);

const [collateral, borrow] = await connection.getMultipleAccountsInfo([new PublicKey(template.collateralMint), new PublicKey(template.borrowMint)]);
if (!collateral || !borrow) throw new Error('NVDAx or USDC mint does not exist on the selected RPC.');
if (!collateral.owner.equals(TOKEN_2022)) throw new Error(`NVDAx is not owned by Token-2022: ${collateral.owner}`);
if (!borrow.owner.equals(TOKEN)) throw new Error(`USDC is not owned by the classic Token Program: ${borrow.owner}`);

let feed = process.env.PRISMA_CHAINLINK_FEED || '';
if (!feed) {
  const response = await fetch('https://api.xstocks.fi/api/v2/public/oracles/NVDAx?network=Solana&managedBy=Chainlink&page=0&pageSize=50');
  if (!response.ok) throw new Error(`xStocks oracle API returned ${response.status}. Set PRISMA_CHAINLINK_FEED manually.`);
  const payload = await response.json() as { nodes?: Array<Record<string, unknown>> };
  for (const node of payload.nodes || []) {
    const candidates = ['address', 'contractAddress', 'oracleAddress', 'feedAddress', 'account'];
    for (const key of candidates) {
      const value = node[key];
      if (typeof value !== 'string') continue;
      try { new PublicKey(value); feed = value; break; } catch { /* continue */ }
    }
    if (feed) break;
  }
}
if (!feed) throw new Error('Could not resolve the NVDAx Chainlink feed. Set PRISMA_CHAINLINK_FEED and rerun.');
const feedKey = new PublicKey(feed);
const feedAccount = await connection.getAccountInfo(feedKey);
if (!feedAccount) throw new Error('Resolved Chainlink feed account does not exist.');
if (!feedAccount.owner.equals(CHAINLINK)) throw new Error(`Oracle owner mismatch. Expected ${CHAINLINK}, got ${feedAccount.owner}`);
if (!template.paused || template.supplyCapBaseUnits !== '0' || template.borrowCapBaseUnits !== '0') throw new Error('Initial market must be paused with zero caps.');

const finalConfig = { ...template, chainlinkFeed: feed, verifiedAt: new Date().toISOString(), rpcGenesisHash: genesis };
await writeFile(resolve(root, 'mainnet/market.json'), JSON.stringify(finalConfig, null, 2) + '\n');
console.log(`Verified mainnet configuration:\n  NVDAx ${template.collateralMint}\n  USDC  ${template.borrowMint}\n  Feed  ${feed}\n  State PAUSED / CAPS 0`);

