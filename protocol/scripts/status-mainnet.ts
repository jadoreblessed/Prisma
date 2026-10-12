import { PublicKey } from '@solana/web3.js';
import { assertMainnet, anchorProgram, marketAddresses, readConfig } from './common.js';

const config = await readConfig();
const { provider, program } = await anchorProgram();
await assertMainnet(provider.connection);
const collateralMint = new PublicKey(config.collateralMint);
const borrowMint = new PublicKey(config.borrowMint);
const { market } = marketAddresses(program.programId, collateralMint, borrowMint);
const state = await (program.account as any).market.fetch(market) as any;
const value = (field: unknown) => field && typeof (field as any).toString === 'function' ? (field as any).toString() : String(field);

console.log(JSON.stringify({
  network: 'solana-mainnet-beta',
  programId: program.programId.toBase58(),
  market: market.toBase58(),
  authority: state.authority.toBase58(),
  pendingAuthority: state.pendingAuthority.toBase58(),
  oracle: state.oracle.toBase58(),
  paused: state.paused,
  supplyCapBaseUnits: value(state.supplyCap),
  borrowCapBaseUnits: value(state.borrowCap),
  totalSupplied: value(state.totalSupplied),
  totalBorrowed: value(state.totalBorrowed),
  totalCollateral: value(state.totalCollateral),
  loanToValueBps: state.loanToValueBps,
  liquidationThresholdBps: state.liquidationThresholdBps,
  liquidationBonusBps: state.liquidationBonusBps,
  borrowRateBps: state.borrowRateBps,
  maxOracleAgeSeconds: state.maxOracleAgeSeconds,
}, null, 2));
