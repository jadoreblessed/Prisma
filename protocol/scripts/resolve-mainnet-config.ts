import { PublicKey } from '@solana/web3.js';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertMainnet, assertSafeConfig, CHAINLINK, connection, root, TOKEN, TOKEN_2022 } from './common.js';

type Config = Record<string, unknown> & { collateralMint: string; borrowMint: string; chainlinkFeed: string; paused: boolean; supplyCapBaseUnits: string; borrowCapBaseUnits: string };
const template = JSON.parse(await readFile(resolve(root, 'mainnet/market.example.json'), 'utf8')) as Config;
assertSafeConfig(template as any);
const conn = connection();
const genesis = await assertMainnet(conn);

const [collateral, borrow] = await conn.getMultipleAccountsInfo([new PublicKey(template.collateralMint), new PublicKey(template.borrowMint)]);
if (!collateral || !borrow) throw new Error('NVDAx or USDC mint does not exist on the selected RPC.');
if (!collateral.owner.equals(TOKEN_2022)) throw new Error(`NVDAx is not owned by Token-2022: ${collateral.owner.toBase58()}`);
if (!borrow.owner.equals(TOKEN)) throw new Error(`USDC is not owned by the classic Token Program: ${borrow.owner.toBase58()}`);

let feed = process.env.PRISMA_CHAINLINK_FEED || '';
{
  const response = await fetch('https://api.xstocks.fi/api/v2/public/oracles/NVDAx?network=Solana&managedBy=Chainlink&page=0&pageSize=50');
  if (!response.ok) throw new Error(`xStocks oracle API returned ${response.status}; cannot verify NVDAx oracle.`);
  const payload = await response.json() as { nodes?: Array<Record<string, unknown>> };
  for (const node of payload.nodes || []) {
    if (node.feedType === 'PullBased') {
      const metadata = node.metadata as Record<string, unknown> | undefined;
      throw new Error(
        `NVDAx on Solana uses a Chainlink PullBased Data Stream (schema ${String(metadata?.reportSchema || 'unknown')}, ` +
        `feed ID ${String(metadata?.feedId || 'unknown')}). This program reads push-based feed accounts and CANNOT use ` +
        `a feed ID, verifier program, or manually supplied push feed as --feed. Deploy is blocked until the program and transaction clients ` +
        `verify signed v10 reports through the Chainlink Solana Data Streams verifier.`,
      );
    }
    for (const key of ['address', 'contractAddress', 'oracleAddress', 'feedAddress', 'account']) {
      const value = node[key];
      if (typeof value !== 'string') continue;
      try { new PublicKey(value); feed = value; break; } catch { /* keep looking */ }
    }
    if (feed) break;
  }
}
if (!feed) throw new Error('No NVDAx Solana push-feed account was published. Do not substitute another asset or a Data Streams verifier address.');
const feedKey = new PublicKey(feed);
const feedAccount = await conn.getAccountInfo(feedKey);
if (!feedAccount) throw new Error('Resolved Chainlink feed account does not exist.');
if (!feedAccount.owner.equals(CHAINLINK)) throw new Error(`Oracle owner mismatch. Expected ${CHAINLINK.toBase58()}, got ${feedAccount.owner.toBase58()}`);

const finalConfig = { ...template, programId: process.env.PRISMA_PROGRAM_ID || template.programId, chainlinkFeed: feed, verifiedAt: new Date().toISOString(), rpcGenesisHash: genesis };
await writeFile(resolve(root, 'mainnet/market.json'), JSON.stringify(finalConfig, null, 2) + '\n');
console.log(`Verified mainnet configuration:\n  NVDAx ${template.collateralMint}\n  USDC  ${template.borrowMint}\n  Feed  ${feed}\n  State PAUSED / CAPS 0`);
