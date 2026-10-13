import { address, createNoopSigner, createSolanaRpc } from '@solana/kit';
import { KaminoAction, KaminoMarket, VanillaObligation, getCurrentLedgerInstant } from '@kamino-finance/klend-sdk';
import { Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { resolveLiveMarket, type BorrowAsset } from './_live-market';

const GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const PROGRAM = 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD';
const RPC = process.env.PRISMA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
type Action = 'supply' | 'collateral' | 'borrow' | 'withdraw' | 'removeCollateral' | 'repay';
const ACTIONS: Action[] = ['supply', 'collateral', 'borrow', 'withdraw', 'removeCollateral', 'repay'];

export function units(value: string, decimals: number): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('invalid_amount');
  const [whole, fractional = ''] = value.split('.');
  if (fractional.length > decimals) throw new Error('too_many_decimals');
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fractional.padEnd(decimals, '0') || '0');
  if (amount <= 0n || amount > 2n ** 64n - 1n) throw new Error('invalid_amount');
  return amount.toString();
}

export async function prepareKamino(asset: string, action: Action, value: string, wallet: string, borrowAsset: BorrowAsset = 'USDC') {
  let owner: PublicKey;
  try {
    owner = new PublicKey(wallet);
    if (!PublicKey.isOnCurve(owner.toBytes())) throw new Error('invalid_wallet');
  } catch {
    throw new Error('invalid_wallet');
  }
  const live = await resolveLiveMarket(asset, borrowAsset);
  if (!live) throw new Error('market_unavailable');
  const rpc = createSolanaRpc(RPC);
  if (await rpc.getGenesisHash().send() !== GENESIS) throw new Error('non_mainnet_rpc');
  const market = await KaminoMarket.load(rpc, address(live.market), 400, address(PROGRAM));
  if (!market || market.programId !== PROGRAM) throw new Error('market_unavailable');
  const collateral = market.getReserveByAddress(address(live.collateralReserve));
  const debt = market.getReserveByAddress(address(live.borrowReserve));
  if (!collateral || !debt || collateral.getLiquidityMint() !== live.collateralMint || debt.getLiquidityMint() !== live.borrowMint) throw new Error('reserve_mismatch');
  const reserve = action === 'collateral' || action === 'removeCollateral' ? collateral : debt;
  const amount = units(value, reserve.getMintDecimals());
  const connection = new Connection(RPC, 'confirmed');
  if (action === 'supply' || action === 'collateral' || action === 'repay') {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(reserve.getLiquidityMint()) });
    const available = accounts.value.reduce((sum, item) => sum + BigInt(item.account.data.parsed.info.tokenAmount.amount), 0n);
    if (available < BigInt(amount)) throw new Error('insufficient_token_balance');
  }
  const obligationType = new VanillaObligation(address(PROGRAM));
  if (action === 'borrow' || action === 'withdraw' || action === 'removeCollateral' || action === 'repay') {
    const obligation = await market.getObligationByWallet(address(wallet), obligationType);
    if (!obligation) throw new Error('position_required');
    if (action === 'borrow' && !obligation.deposits.has(address(live.collateralReserve))) throw new Error('collateral_required');
    if ((action === 'withdraw' || action === 'removeCollateral') && !obligation.deposits.has(reserve.address)) throw new Error('deposit_required');
    if (action === 'repay' && !obligation.borrows.has(debt.address)) throw new Error('debt_required');
  }
  const props = {
    kaminoMarket: market, amount, reserveAddress: reserve.address,
    owner: createNoopSigner(address(wallet)), obligation: obligationType,
    useV2Ixs: true, scopeRefreshConfig: undefined,
    initUserMetadata: { skipInitialization: false, skipLutCreation: true },
    currentLedgerInstant: await getCurrentLedgerInstant(rpc),
  };
  const built = action === 'borrow' ? await KaminoAction.buildBorrowTxns(props) :
    action === 'repay' ? await KaminoAction.buildRepayTxns(props) :
    action === 'withdraw' || action === 'removeCollateral' ? await KaminoAction.buildWithdrawTxns(props) :
    await KaminoAction.buildDepositTxns(props);
  const instructions = KaminoAction.actionToIxs(built);
  if (!instructions.length) throw new Error('empty_action');
  const lookups = await Promise.all(built.luts.map(async key => {
    const result = await connection.getAddressLookupTable(new PublicKey(key));
    if (!result.value) throw new Error('lookup_table_unavailable');
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
  const latest = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({ payerKey: owner, recentBlockhash: latest.blockhash,
    instructions: web3Instructions }).compileToV0Message(lookups);
  const transaction = new VersionedTransaction(message);
  if (transaction.serialize().length > 1232) throw new Error('transaction_too_large');
  if (message.header.numRequiredSignatures !== 1 || !message.staticAccountKeys[0].equals(owner)) throw new Error('unexpected_signer');
  const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
  if (simulation.value.err) throw new Error('simulation_failed: ' + JSON.stringify(simulation.value.err));
  const fee = await connection.getFeeForMessage(message, 'confirmed');
  return {
    action, asset, amount: value, token: action === 'collateral' || action === 'removeCollateral' ? live.collateralSymbol : live.borrowSymbol,
    borrowAsset: live.borrowSymbol,
    market: live.market, reserve: reserve.address, mint: reserve.getLiquidityMint(),
    transaction: Buffer.from(transaction.serialize()).toString('base64'),
    blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight,
    feeLamports: fee.value, computeUnits: simulation.value.unitsConsumed ?? null,
    checkedAt: Date.now(),
  };
}

function send(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'invalid_body' }); } }
  if (!body || !ACTIONS.includes(body.action) || typeof body.asset !== 'string' ||
      typeof body.amount !== 'string' || typeof body.wallet !== 'string' || body.amount.length > 40 ||
      (body.borrowAsset !== undefined && body.borrowAsset !== 'USDC' && body.borrowAsset !== 'USDG')) return send(res, 400, { error: 'invalid_request' });
  try {
    return send(res, 200, await prepareKamino(body.asset, body.action, body.amount, body.wallet, body.borrowAsset || 'USDC'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'preflight_failed';
    const known = /^(invalid_wallet|invalid_amount|too_many_decimals|market_unavailable|non_mainnet_rpc|reserve_mismatch|insufficient_token_balance|collateral_required|position_required|deposit_required|debt_required|empty_action|lookup_table_unavailable|transaction_too_large|unexpected_signer)/.test(reason);
    return send(res, known ? 400 : 503, { error: known ? reason : 'preflight_failed' });
  }
}
