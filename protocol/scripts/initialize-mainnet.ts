import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const config = JSON.parse(await readFile(resolve(root, 'mainnet/market.json'), 'utf8'));
const idl = JSON.parse(await readFile(resolve(root, 'target/idl/prisma_lending.json'), 'utf8'));
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = new anchor.Program(idl, provider);
const collateralMint = new PublicKey(config.collateralMint);
const borrowMint = new PublicKey(config.borrowMint);
const oracle = new PublicKey(config.chainlinkFeed);
const [market] = PublicKey.findProgramAddressSync([Buffer.from('market'), collateralMint.toBuffer(), borrowMint.toBuffer()], program.programId);
const [collateralVault] = PublicKey.findProgramAddressSync([Buffer.from('collateral-vault'), market.toBuffer()], program.programId);
const [liquidityVault] = PublicKey.findProgramAddressSync([Buffer.from('liquidity-vault'), market.toBuffer()], program.programId);
const collateralInfo = await provider.connection.getAccountInfo(collateralMint);
const borrowInfo = await provider.connection.getAccountInfo(borrowMint);
if (!collateralInfo || !borrowInfo) throw new Error('Mint account missing.');

if (!(await provider.connection.getAccountInfo(market))) {
  await program.methods.initializeMarket({
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

const account = await program.account.market.fetch(market) as any;
if (!account.paused || !account.supplyCap.eq(new anchor.BN(0)) || !account.borrowCap.eq(new anchor.BN(0))) throw new Error('Safety invariant failed: initialized market is active or has non-zero caps.');
const deployment = { programId: program.programId.toBase58(), market: market.toBase58(), collateralVault: collateralVault.toBase58(), liquidityVault: liquidityVault.toBase58(), authority: provider.wallet.publicKey.toBase58(), paused: true, supplyCap: '0', borrowCap: '0', initializedAt: new Date().toISOString() };
await writeFile(resolve(root, 'mainnet/deployment.json'), JSON.stringify(deployment, null, 2) + '\n');
console.log(JSON.stringify(deployment, null, 2));

