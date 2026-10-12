import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { assertMainnet, anchorProgram, marketAddresses, readConfig, u64 } from './common.js';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { root } from './common.js';

if (process.env.PRISMA_ACTIVATION_ACK !== 'I_ACCEPT_MAINNET_RISK') {
  throw new Error('Refusing market configuration. Set PRISMA_ACTIVATION_ACK=I_ACCEPT_MAINNET_RISK after audit and operational review.');
}
const supplyCap = u64(process.env.PRISMA_SUPPLY_CAP_BASE_UNITS, 'PRISMA_SUPPLY_CAP_BASE_UNITS');
const borrowCap = u64(process.env.PRISMA_BORROW_CAP_BASE_UNITS, 'PRISMA_BORROW_CAP_BASE_UNITS');
const unpause = process.env.PRISMA_UNPAUSE === 'true';
if (unpause && (supplyCap === 0n || borrowCap === 0n)) throw new Error('Unpausing requires non-zero supply and borrow caps.');

const config = await readConfig();
const { provider, program } = await anchorProgram();
await assertMainnet(provider.connection);
const collateralMint = new PublicKey(config.collateralMint);
const borrowMint = new PublicKey(config.borrowMint);
const { market } = marketAddresses(program.programId, collateralMint, borrowMint);
const before = await (program.account as any).market.fetch(market) as any;
if (!before.authority.equals(provider.wallet.publicKey)) throw new Error('Connected wallet is not the market authority.');

const signature = await program.methods.configureMarket({
  supplyCap: new anchor.BN(supplyCap.toString()),
  borrowCap: new anchor.BN(borrowCap.toString()),
  paused: !unpause,
  maxOracleAgeSeconds: null,
}).accountsStrict({ market, authority: provider.wallet.publicKey }).rpc();

const after = await (program.account as any).market.fetch(market) as any;
if (after.supplyCap.toString() !== supplyCap.toString() || after.borrowCap.toString() !== borrowCap.toString() || after.paused === unpause) {
  throw new Error('Post-configuration state does not match the requested caps/pause state.');
}
console.log(JSON.stringify({ signature, market: market.toBase58(), supplyCapBaseUnits: supplyCap.toString(), borrowCapBaseUnits: borrowCap.toString(), paused: after.paused }, null, 2));
const exported = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/export-deployment-env.ts'], { cwd: resolve(root, 'protocol'), stdio: 'inherit', env: process.env });
if (exported.status !== 0) throw new Error('Market changed, but frontend runtime export failed. Run npm --prefix protocol run export-env.');
