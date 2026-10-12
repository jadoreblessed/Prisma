import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PublicKey } from '@solana/web3.js';
import { anchorProgram, assertMainnet, root } from './common.js';

const deployment = JSON.parse(await readFile(resolve(root, 'mainnet/deployment.json'), 'utf8'));
const { provider, program } = await anchorProgram();
await assertMainnet(provider.connection);
if (program.programId.toBase58() !== deployment.programId) throw new Error('Deployment program ID does not match the built IDL.');
const state = await (program.account as any).market.fetch(new PublicKey(deployment.market)) as any;
const transactionsEnabled = !state.paused && !state.supplyCap.isZero() && !state.borrowCap.isZero();
const lines = [
  `PRISMA_PROGRAM_ID=${deployment.programId}`,
  `PRISMA_MARKET_ADDRESS=${deployment.market}`,
  `VITE_PRISMA_PROGRAM_ID=${deployment.programId}`,
  `VITE_PRISMA_MARKET_ADDRESS=${deployment.market}`,
  `VITE_PRISMA_COLLATERAL_MINT=${deployment.collateralMint}`,
  `VITE_PRISMA_BORROW_MINT=${deployment.borrowMint}`,
  `VITE_PRISMA_CHAINLINK_FEED=${deployment.oracle}`,
  'VITE_PRISMA_CLUSTER=mainnet-beta',
  `VITE_PRISMA_TRANSACTIONS_ENABLED=${transactionsEnabled}`,
];
await writeFile(resolve(root, 'mainnet/frontend.env'), lines.join('\n') + '\n', { mode: 0o600 });

const publicDir = resolve(root, 'public/protocol');
await mkdir(publicDir, { recursive: true });
await copyFile(resolve(root, 'target/idl/prisma_lending.json'), resolve(publicDir, 'prisma_lending.json'));
await writeFile(resolve(publicDir, 'deployment.json'), JSON.stringify({
  schemaVersion: 1,
  configured: true,
  cluster: 'mainnet-beta',
  symbol: deployment.symbol || 'NVDAx/USDC',
  programId: deployment.programId,
  market: deployment.market,
  collateralMint: deployment.collateralMint,
  borrowMint: deployment.borrowMint,
  oracle: deployment.oracle,
  collateralVault: deployment.collateralVault,
  liquidityVault: deployment.liquidityVault,
  paused: Boolean(state.paused),
  supplyCapBaseUnits: state.supplyCap.toString(),
  borrowCapBaseUnits: state.borrowCap.toString(),
  transactionsEnabled,
  exportedAt: new Date().toISOString(),
}, null, 2) + '\n');
console.log(`Wrote frontend runtime config and IDL (transactions ${transactionsEnabled ? 'enabled' : 'disabled'}).`);
