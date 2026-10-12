import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertMainnet, marketAddresses, root, sha256 } from './common.js';

const config = JSON.parse(await readFile(resolve(root, 'mainnet/market.json'), 'utf8'));
const idl = JSON.parse(await readFile(resolve(root, 'target/idl/prisma_lending.json'), 'utf8'));
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = new anchor.Program(idl, provider);
await assertMainnet(provider.connection);
const collateralMint = new PublicKey(config.collateralMint);
const borrowMint = new PublicKey(config.borrowMint);
const oracle = new PublicKey(config.chainlinkFeed);
const { market, collateralVault, liquidityVault } = marketAddresses(program.programId, collateralMint, borrowMint);
const collateralInfo = await provider.connection.getAccountInfo(collateralMint);
const borrowInfo = await provider.connection.getAccountInfo(borrowMint);
if (!collateralInfo || !borrowInfo) throw new Error('Mint account missing.');

let initializationSignature: string | null = null;
if (!(await provider.connection.getAccountInfo(market))) {
  initializationSignature = await program.methods.initializeMarket({
    loanToValueBps: config.loanToValueBps,
    liquidationThresholdBps: config.liquidationThresholdBps,
    liquidationBonusBps: config.liquidationBonusBps,
    maxOracleAgeSeconds: config.maxOracleAgeSeconds,
    borrowRateBps: config.borrowRateBps,
  }).accountsStrict({
    authority: provider.wallet.publicKey,
    collateralMint,
    borrowMint,
    oracle,
    market,
    collateralVault,
    liquidityVault,
    collateralTokenProgram: collateralInfo.owner,
    borrowTokenProgram: borrowInfo.owner,
    systemProgram: SystemProgram.programId,
  }).rpc();
}

const account = await (program.account as any).market.fetch(market) as any;
const equals = (value: PublicKey, expected: PublicKey, name: string) => { if (!value.equals(expected)) throw new Error(`${name} mismatch: ${value.toBase58()}`); };
equals(account.authority, provider.wallet.publicKey, 'market authority');
equals(account.collateralMint, collateralMint, 'collateral mint');
equals(account.borrowMint, borrowMint, 'borrow mint');
equals(account.oracle, oracle, 'oracle');
equals(account.collateralVault, collateralVault, 'collateral vault');
equals(account.liquidityVault, liquidityVault, 'liquidity vault');
if (!account.paused || !account.supplyCap.eq(new anchor.BN(0)) || !account.borrowCap.eq(new anchor.BN(0))) throw new Error('Safety invariant failed: initialized market is active or has non-zero caps.');
const soPath = resolve(root, 'target/deploy/prisma_lending.so');
const deployment = { programId: program.programId.toBase58(), market: market.toBase58(), collateralVault: collateralVault.toBase58(), liquidityVault: liquidityVault.toBase58(), collateralMint: collateralMint.toBase58(), borrowMint: borrowMint.toBase58(), oracle: oracle.toBase58(), authority: provider.wallet.publicKey.toBase58(), paused: true, supplyCap: '0', borrowCap: '0', initializationSignature, binarySha256: await sha256(soPath), verifiedAt: new Date().toISOString() };
await writeFile(resolve(root, 'mainnet/deployment.json'), JSON.stringify(deployment, null, 2) + '\n');
console.log(JSON.stringify(deployment, null, 2));
