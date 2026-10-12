import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { assertMainnet, anchorProgram, CHAINLINK, marketAddresses, readConfig } from './common.js';

const config = await readConfig();
const { provider, program } = await anchorProgram();
await assertMainnet(provider.connection);
const collateralMint = new PublicKey(config.collateralMint);
const borrowMint = new PublicKey(config.borrowMint);
const oracle = new PublicKey(config.chainlinkFeed);
const { market, collateralVault, liquidityVault } = marketAddresses(program.programId, collateralMint, borrowMint);
const [programInfo, oracleInfo, collateralVaultInfo, liquidityVaultInfo] = await provider.connection.getMultipleAccountsInfo([program.programId, oracle, collateralVault, liquidityVault]);
if (!programInfo?.executable) throw new Error('Program account is missing or not executable.');
if (!oracleInfo?.owner.equals(CHAINLINK)) throw new Error('Oracle is not owned by the approved Chainlink program.');
if (!collateralVaultInfo || !liquidityVaultInfo) throw new Error('One or both token vaults are missing.');

const state = await (program.account as any).market.fetch(market) as any;
const expectKey = (actual: PublicKey, expected: PublicKey, field: string) => { if (!actual.equals(expected)) throw new Error(`${field} mismatch.`); };
expectKey(state.collateralMint, collateralMint, 'collateralMint');
expectKey(state.borrowMint, borrowMint, 'borrowMint');
expectKey(state.oracle, oracle, 'oracle');
expectKey(state.collateralVault, collateralVault, 'collateralVault');
expectKey(state.liquidityVault, liquidityVault, 'liquidityVault');
if (!state.paused) throw new Error('Market must remain paused after deployment.');
if (!state.supplyCap.eq(new anchor.BN(0)) || !state.borrowCap.eq(new anchor.BN(0))) throw new Error('Initial caps must remain zero.');
if (!state.totalSupplied.eq(new anchor.BN(0)) || !state.totalBorrowed.eq(new anchor.BN(0)) || !state.totalCollateral.eq(new anchor.BN(0))) throw new Error('Fresh deployment unexpectedly contains funds.');

console.log(`ONCHAIN VERIFICATION PASSED\n  program ${program.programId.toBase58()}\n  market  ${market.toBase58()}\n  state   PAUSED / CAPS 0 / BALANCES 0`);
