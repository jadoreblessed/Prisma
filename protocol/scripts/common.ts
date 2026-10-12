import * as anchor from '@coral-xyz/anchor';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

export const root = resolve(import.meta.dirname, '../..');
export const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
export const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const CHAINLINK = new PublicKey('HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny');

export type MarketConfig = {
  cluster: 'mainnet-beta';
  symbol: string;
  collateralMint: string;
  borrowMint: string;
  chainlinkFeed: string;
  loanToValueBps: number;
  liquidationThresholdBps: number;
  liquidationBonusBps: number;
  borrowRateBps: number;
  maxOracleAgeSeconds: number;
  supplyCapBaseUnits: string;
  borrowCapBaseUnits: string;
  paused: boolean;
};

export function rpcUrl() {
  const rpc = process.env.SOLANA_MAINNET_RPC || process.env.ANCHOR_PROVIDER_URL;
  if (!rpc) throw new Error('Set SOLANA_MAINNET_RPC or ANCHOR_PROVIDER_URL to a private mainnet endpoint.');
  return rpc;
}

export function connection() {
  return new Connection(rpcUrl(), { commitment: 'confirmed', confirmTransactionInitialTimeout: 120_000 });
}

export async function assertMainnet(conn: Connection) {
  const genesis = await conn.getGenesisHash();
  if (genesis !== MAINNET_GENESIS) throw new Error(`Refusing non-mainnet RPC. Genesis hash: ${genesis}`);
  return genesis;
}

export async function readConfig(path = 'mainnet/market.json') {
  return JSON.parse(await readFile(resolve(root, path), 'utf8')) as MarketConfig & Record<string, unknown>;
}

export async function loadWallet(path = process.env.ANCHOR_WALLET) {
  if (!path) throw new Error('Set ANCHOR_WALLET or pass --wallet to the release script.');
  const expanded = path.replace(/^~(?=\/)/, process.env.HOME || '');
  const raw = JSON.parse(await readFile(resolve(expanded), 'utf8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function u64(value: unknown, field: string) {
  const text = String(value);
  if (!/^\d+$/.test(text)) throw new Error(`${field} must be an unsigned base-unit integer.`);
  const parsed = BigInt(text);
  if (parsed > 18_446_744_073_709_551_615n) throw new Error(`${field} exceeds u64.`);
  return parsed;
}

export function assertSafeConfig(config: MarketConfig) {
  if (config.cluster !== 'mainnet-beta') throw new Error('Config cluster must be mainnet-beta.');
  if (!config.paused || u64(config.supplyCapBaseUnits, 'supplyCapBaseUnits') !== 0n || u64(config.borrowCapBaseUnits, 'borrowCapBaseUnits') !== 0n) {
    throw new Error('Initial deployment must be paused with zero supply and borrow caps.');
  }
  if (!(config.loanToValueBps > 0 && config.loanToValueBps < config.liquidationThresholdBps && config.liquidationThresholdBps < 10_000)) throw new Error('Invalid LTV/liquidation threshold.');
  if (config.liquidationBonusBps < 0 || config.liquidationBonusBps > 2_000) throw new Error('Liquidation bonus must be 0..2000 bps.');
  if (config.borrowRateBps < 0 || config.borrowRateBps > 5_000) throw new Error('Borrow rate must be 0..5000 bps.');
  if (config.maxOracleAgeSeconds < 30) throw new Error('maxOracleAgeSeconds must be at least 30.');
  if (config.collateralMint === config.borrowMint) throw new Error('Collateral and borrow mint cannot match.');
}

export async function anchorProgram() {
  const idl = JSON.parse(await readFile(resolve(root, 'target/idl/prisma_lending.json'), 'utf8'));
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  return { provider, program: new anchor.Program(idl, provider) };
}

export function marketAddresses(programId: PublicKey, collateralMint: PublicKey, borrowMint: PublicKey) {
  const [market] = PublicKey.findProgramAddressSync([Buffer.from('market'), collateralMint.toBuffer(), borrowMint.toBuffer()], programId);
  const [collateralVault] = PublicKey.findProgramAddressSync([Buffer.from('collateral-vault'), market.toBuffer()], programId);
  const [liquidityVault] = PublicKey.findProgramAddressSync([Buffer.from('liquidity-vault'), market.toBuffer()], programId);
  return { market, collateralVault, liquidityVault };
}

export async function sha256(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}
