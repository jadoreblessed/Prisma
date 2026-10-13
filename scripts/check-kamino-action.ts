/** Read-only mainnet preflight. Builds Kamino instructions, never signs or sends. */
import { address, createNoopSigner, createSolanaRpc } from '@solana/kit';
import { KaminoAction, KaminoMarket, VanillaObligation, getCurrentLedgerInstant } from '@kamino-finance/klend-sdk';
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { resolveLiveMarket } from '../api/live-market';

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const KLEND_PROGRAM = 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD';

export function baseUnits(amount: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18 || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)) {
    throw new Error('Invalid token amount');
  }
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > decimals) throw new Error(`Amount has more than ${decimals} decimal places`);
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction.padEnd(decimals, '0') || '0'));
  if (units <= 0n || units > 2n ** 64n - 1n) throw new Error('Amount is outside token limits');
  return units.toString();
}

async function main() {
  const [asset, action, amount, wallet] = process.argv.slice(2);
  const rpcUrl = process.env.PRISMA_MAINNET_RPC;
  if (!rpcUrl || !/^https:\/\//.test(rpcUrl)) throw new Error('Set PRISMA_MAINNET_RPC to an HTTPS mainnet endpoint');
  if (!['supply', 'collateral', 'borrow'].includes(action) || !asset || !amount || !wallet) {
    throw new Error('Usage: PRISMA_MAINNET_RPC=https://... npx tsx scripts/check-kamino-action.ts NVDA supply|collateral|borrow AMOUNT WALLET');
  }
  const rpc = createSolanaRpc(rpcUrl);
  if (await rpc.getGenesisHash().send() !== MAINNET_GENESIS) throw new Error('RPC is not Solana mainnet');
  const resolved = await resolveLiveMarket(asset.toUpperCase());
  if (!resolved) throw new Error('No independently verified xStock / USDC reserve for this asset');
  const market = await KaminoMarket.load(rpc, address(resolved.market), 400, address(KLEND_PROGRAM));
  if (!market || market.programId !== KLEND_PROGRAM) throw new Error('Kamino market account unavailable');
  const collateral = market.getReserveByAddress(address(resolved.collateralReserve));
  const debt = market.getReserveByAddress(address(resolved.borrowReserve));
  if (!collateral || !debt || collateral.getLiquidityMint() !== resolved.collateralMint ||
      debt.getLiquidityMint() !== resolved.borrowMint) throw new Error('Onchain reserve mint does not match public listing');
  const reserve = action === 'collateral' ? collateral : debt;
  const amountAtomic = baseUnits(amount, reserve.getMintDecimals());
  const obligationType = new VanillaObligation(address(KLEND_PROGRAM));
  if (action === 'borrow') {
    const obligation = await market.getObligationByWallet(address(wallet), obligationType);
    if (!obligation || !obligation.deposits.has(address(resolved.collateralReserve))) {
      throw new Error(`Borrow preflight stopped: wallet has no ${asset.toUpperCase()}x collateral in this obligation`);
    }
  }
  const props = {
    kaminoMarket: market, amount: amountAtomic, reserveAddress: reserve.address,
    owner: createNoopSigner(address(wallet)), obligation: obligationType,
    useV2Ixs: true, scopeRefreshConfig: undefined,
    initUserMetadata: { skipInitialization: false, skipLutCreation: true },
    currentLedgerInstant: await getCurrentLedgerInstant(rpc),
  };
  const built = action === 'borrow' ? await KaminoAction.buildBorrowTxns(props) : await KaminoAction.buildDepositTxns(props);
  const instructions = KaminoAction.actionToIxs(built);
  if (!instructions.length) throw new Error('No instructions returned by Kamino SDK');
  const connection = new Connection(rpcUrl, 'confirmed');
  const lookups = await Promise.all(built.luts.map(async lut => {
    const result = await connection.getAddressLookupTable(new PublicKey(lut));
    if (!result.value) throw new Error(`Required lookup table unavailable: ${lut}`);
    return result.value;
  }));
  const web3Instructions = instructions.map(ix => new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: (ix.accounts || []).map(account => ({
      pubkey: new PublicKey(account.address),
      isSigner: (account.role & 2) !== 0,
      isWritable: (account.role & 1) !== 0,
    })),
    data: Buffer.from(ix.data || []),
  }));
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({ payerKey: new PublicKey(wallet), recentBlockhash: blockhash,
    instructions: web3Instructions }).compileToV0Message(lookups);
  const transaction = new VersionedTransaction(message);
  const serializedBytes = transaction.serialize().length;
  if (serializedBytes > 1232) throw new Error(`Transaction needs splitting: ${serializedBytes} bytes`);
  const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
  console.log(JSON.stringify({
    status: simulation.value.err ? 'simulation_failed' : 'simulation_passed', asset, action, amount, wallet,
    market: resolved.market, reserve: reserve.address, mint: reserve.getLiquidityMint(),
    instructionCount: instructions.length, serializedBytes,
    programs: [...new Set(instructions.map(ix => ix.programAddress))],
    labels: [...built.setupIxsLabels, ...built.lendingIxsLabels, ...built.cleanupIxsLabels],
    simulationError: simulation.value.err,
    computeUnits: simulation.value.unitsConsumed ?? null,
    logs: simulation.value.err ? simulation.value.logs?.slice(-10) : undefined,
  }, null, 2));
  if (simulation.value.err) process.exitCode = 2;
}

if (process.argv[1]?.endsWith('check-kamino-action.ts')) main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
