import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ExtensionType, getExtensionTypes, unpackMint } from '@solana/spl-token';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assertMainnet, assertSafeConfig, CHAINLINK, connection, loadWallet, readConfig, TOKEN, TOKEN_2022 } from './common.js';

const conn = connection();
const genesis = await assertMainnet(conn);
const wallet = await loadWallet();
const template = await readConfig('mainnet/market.example.json');
assertSafeConfig(template);

const collateralKey = new PublicKey(template.collateralMint);
const borrowKey = new PublicKey(template.borrowMint);
const [collateralInfo, borrowInfo] = await conn.getMultipleAccountsInfo([collateralKey, borrowKey]);
if (!collateralInfo || !borrowInfo) throw new Error('NVDAx or USDC mint is missing on this RPC.');
if (!collateralInfo.owner.equals(TOKEN_2022)) throw new Error(`NVDAx owner mismatch: ${collateralInfo.owner.toBase58()}`);
if (!borrowInfo.owner.equals(TOKEN)) throw new Error(`USDC owner mismatch: ${borrowInfo.owner.toBase58()}`);

const collateralMint = unpackMint(collateralKey, collateralInfo, TOKEN_2022);
const borrowMint = unpackMint(borrowKey, borrowInfo, TOKEN);
if (collateralMint.decimals > 18 || borrowMint.decimals > 18) throw new Error('Mint decimals above 18 are unsupported.');
const extensions = getExtensionTypes(collateralMint.tlvData);
const blocked = new Set([ExtensionType.TransferFeeConfig, ExtensionType.TransferHook, ExtensionType.ConfidentialTransferMint, ExtensionType.NonTransferable]);
const blockedFound = extensions.filter(extension => blocked.has(extension));
if (blockedFound.length) throw new Error(`NVDAx has accounting-incompatible Token-2022 extensions: ${blockedFound.map(x => ExtensionType[x]).join(', ')}`);

const feedText = process.env.PRISMA_CHAINLINK_FEED;
if (feedText) {
  const feed = new PublicKey(feedText);
  const feedInfo = await conn.getAccountInfo(feed);
  if (!feedInfo) throw new Error('PRISMA_CHAINLINK_FEED does not exist.');
  if (!feedInfo.owner.equals(CHAINLINK)) throw new Error(`Chainlink owner mismatch: ${feedInfo.owner.toBase58()}`);
}

const balanceLamports = await conn.getBalance(wallet.publicKey, 'confirmed');
const maxBudgetLamports = Math.ceil(0.05 * LAMPORTS_PER_SOL);
const feeReserveLamports = Math.ceil(0.005 * LAMPORTS_PER_SOL);
if (balanceLamports > maxBudgetLamports) {
  throw new Error(`The deploy wallet holds ${(balanceLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL, above the strict 0.05 SOL spending ceiling. Use a dedicated deploy wallet funded with at most 0.05 SOL.`);
}
let requiredLamports = feeReserveLamports;
let binary = 'not built yet';
const soPath = process.env.PRISMA_PROGRAM_SO;
if (soPath) {
  const bytes = (await stat(resolve(soPath))).size;
  const programDataBytes = bytes * 2 + 48;
  requiredLamports += await conn.getMinimumBalanceForRentExemption(programDataBytes, 'confirmed');
  // Conservative allowances for the program account, market state and two token vaults.
  for (const size of [36, 512, 165, 165]) {
    requiredLamports += await conn.getMinimumBalanceForRentExemption(size, 'confirmed');
  }
  binary = `${bytes.toLocaleString()} bytes (budgeted at 2x program-data capacity)`;
  if (requiredLamports > maxBudgetLamports) {
    throw new Error(`Deployment exceeds the 0.05 SOL cap: estimated minimum ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL including account rent and a fee reserve. Nothing was deployed. Reduce program size or change the budget; do not bypass this gate.`);
  }
}
if (balanceLamports < requiredLamports) {
  throw new Error(`Insufficient deploy wallet balance. Have ${(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL; conservative minimum is ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL.`);
}

console.log([
  'MAINNET PREFLIGHT PASSED',
  `  genesis       ${genesis}`,
  `  deployer      ${wallet.publicKey.toBase58()}`,
  `  balance       ${(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
  `  NVDAx         ${collateralKey.toBase58()} (${collateralMint.decimals} decimals)`,
  `  extensions    ${extensions.length ? extensions.map(x => ExtensionType[x]).join(', ') : 'none'}`,
  `  USDC          ${borrowKey.toBase58()} (${borrowMint.decimals} decimals)`,
  `  Chainlink     ${feedText || 'will be resolved before initialization'}`,
  `  binary        ${binary}`,
  '  initial state PAUSED / CAPS 0',
].join('\n'));
