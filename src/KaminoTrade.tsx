import { useEffect, useState } from 'react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import type { PhantomProvider } from './protocolClient';

const RPC = 'https://api.mainnet-beta.solana.com';
const KLEND = 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD';
type Action = 'supply' | 'collateral' | 'borrow' | 'withdraw' | 'removeCollateral' | 'repay';
type Market = { market: string; collateralMint: string; collateralReserve: string; borrowMint: string; borrowReserve: string; collateralSymbol: string; maxLtv: number; liquidationLtv: number };
type Prepared = { action: Action; asset: string; amount: string; token: string; market: string; reserve: string; mint: string;
  transaction: string; blockhash: string; lastValidBlockHeight: number; feeLamports: number | null; computeUnits: number | null; checkedAt: number };

const messages: Record<string, string> = {
  collateral_required: 'Deposit this xStock as collateral before borrowing.',
  position_required: 'There is no position in this market for this wallet.',
  deposit_required: 'No matching deposit is available to withdraw.',
  debt_required: 'No USDC debt is available to repay.',
  insufficient_token_balance: 'Not enough of this token in your wallet.',
  market_unavailable: 'This live market is unavailable right now.',
  reserve_mismatch: 'Market verification failed. No transaction was created.',
  simulation_failed: 'The transaction did not pass mainnet simulation. Check your balance and position.',
  preflight_failed: 'Could not prepare a safe transaction. Please try again later.',
};

function decode(base64: string) {
  return VersionedTransaction.deserialize(Uint8Array.from(atob(base64), character => character.charCodeAt(0)));
}

export default function KaminoTrade({ asset, market, wallet, onConnect, onComplete }: {
  asset: string; market: Market; wallet?: string; onConnect: () => Promise<void>; onComplete: () => void;
}) {
  const [action, setAction] = useState<Action>('supply');
  const [amount, setAmount] = useState('');
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [preparedAt, setPreparedAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  useEffect(() => { setPrepared(null); setAmount(''); setError(''); setSignature(''); }, [asset, wallet]);

  async function prepare() {
    if (!wallet || busy) return;
    setBusy(true); setError(''); setPrepared(null); setSignature('');
    try {
      const response = await fetch('/api/kamino-prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, action, amount, wallet }) });
      const data = await response.json();
      if (!response.ok) throw new Error(messages[data.error] || messages.preflight_failed);
      const result = data as Prepared;
      const expectedReserve = action === 'collateral' || action === 'removeCollateral' ? market.collateralReserve : market.borrowReserve;
      const expectedMint = action === 'collateral' || action === 'removeCollateral' ? market.collateralMint : market.borrowMint;
      if (result.market !== market.market || result.reserve !== expectedReserve || result.mint !== expectedMint ||
          result.asset !== asset || result.action !== action || result.amount !== amount) throw new Error('Market changed during preparation. Please retry.');
      const transaction = decode(result.transaction);
      if (transaction.message.header.numRequiredSignatures !== 1 ||
          !transaction.message.staticAccountKeys[0].equals(new PublicKey(wallet)) ||
          transaction.message.recentBlockhash !== result.blockhash ||
          !transaction.message.staticAccountKeys.some(key => key.toBase58() === KLEND)) throw new Error('Transaction verification failed.');
      setPrepared(result); setPreparedAt(Date.now());
    } catch (cause) { setError(cause instanceof Error ? cause.message : messages.preflight_failed); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!prepared || !wallet || busy) return;
    if (Date.now() - preparedAt > 45000) { setPrepared(null); setError('Quote expired. Prepare it again.'); return; }
    const phantom = window.phantom?.solana || window.solana;
    if (!phantom?.isPhantom || !phantom.signAndSendTransaction || phantom.publicKey?.toBase58() !== wallet) {
      setPrepared(null); setError('Reconnect the same Phantom wallet before signing.'); return;
    }
    setBusy(true); setError('');
    try {
      const transaction = decode(prepared.transaction);
      const { signature: submitted } = await phantom.signAndSendTransaction(transaction);
      setSignature(submitted);
      const result = await new Connection(RPC, 'confirmed').confirmTransaction({
        signature: submitted, blockhash: prepared.blockhash, lastValidBlockHeight: prepared.lastValidBlockHeight,
      }, 'confirmed');
      if (result.value.err) throw new Error('Transaction failed onchain: ' + JSON.stringify(result.value.err));
      setPrepared(null); setAmount(''); onComplete();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Phantom transaction failed.'); }
    finally { setBusy(false); }
  }

  return <section className="product-trade" aria-label="Live lending actions">
    <h4>ACT ON THIS MARKET</h4>
    <div className="product-trade__tabs" role="group" aria-label="Action">
      {([['supply', 'Supply USDC'], ['collateral', `Add ${market.collateralSymbol}`], ['borrow', 'Borrow USDC'],
        ['withdraw', 'Withdraw USDC'], ['removeCollateral', `Remove ${market.collateralSymbol}`], ['repay', 'Repay USDC']] as const).map(([key, label]) =>
        <button type="button" key={key} className={action === key ? 'active' : ''} onClick={() => { setAction(key); setPrepared(null); setError(''); }}>{label}</button>)}
    </div>
    <p>{action === 'borrow' ? `Borrow USDC against ${market.collateralSymbol} already deposited in this Kamino market.` :
      action === 'collateral' ? `Deposit ${market.collateralSymbol} as collateral before borrowing USDC.` :
      action === 'removeCollateral' ? `Remove ${market.collateralSymbol} collateral, subject to your remaining loan limit.` :
      action === 'repay' ? 'Repay USDC debt in this market.' : action === 'withdraw' ? 'Withdraw previously supplied USDC.' :
      'Supply USDC to the verified Kamino reserve.'}</p>
    <label className="product-trade__amount">AMOUNT · {action === 'collateral' || action === 'removeCollateral' ? market.collateralSymbol : 'USDC'}
      <input inputMode="decimal" autoComplete="off" value={amount} placeholder="0.00" onChange={event => { setAmount(event.target.value); setPrepared(null); setError(''); }}/>
    </label>
    {!wallet ? <button type="button" onClick={onConnect}>Connect Phantom</button> :
      <button type="button" disabled={busy || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)} onClick={prepare}>{busy ? 'Checking mainnet…' : 'Review transaction'}</button>}
    {prepared && <div className="product-trade__review">
      <strong>{({supply:'Supply',collateral:'Deposit collateral',borrow:'Borrow',withdraw:'Withdraw',removeCollateral:'Remove collateral',repay:'Repay'} as Record<Action,string>)[prepared.action]} {prepared.amount} {prepared.token}</strong>
      <span>Network: Solana mainnet · Market: {prepared.market.slice(0, 6)}…{prepared.market.slice(-5)}</span>
      <span>Estimated network fee: {prepared.feeLamports === null ? 'unavailable' : (prepared.feeLamports / 1e9).toFixed(6) + ' SOL'}; account rent may be additional.</span>
      <span>Max LTV {(market.maxLtv * 100).toFixed(1)}% · liquidation LTV {(market.liquidationLtv * 100).toFixed(1)}%</span>
      <button type="button" disabled={busy} onClick={submit}>{busy ? 'Waiting for Phantom…' : 'Confirm in Phantom'}</button>
    </div>}
    {error && <p className="product-trade__error" role="alert">{error}</p>}
    {signature && <p className="product-trade__receipt">Transaction: <a href={`https://solscan.io/tx/${encodeURIComponent(signature)}`} target="_blank" rel="noopener noreferrer">{signature.slice(0, 12)}… ↗</a></p>}
  </section>;
}
