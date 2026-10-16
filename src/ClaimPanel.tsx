import { useEffect, useRef, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import './ClaimPanel.css';

const distributorId = import.meta.env.VITE_PRISMA_DISTRIBUTOR_ID?.trim() || '';
const tokenMint = import.meta.env.VITE_PRISMA_TOKEN_MINT?.trim() || '';
const tokenDecimals = Number(import.meta.env.VITE_PRISMA_TOKEN_DECIMALS || '9');
const rpc = import.meta.env.VITE_PRISMA_CLAIM_RPC?.trim() || 'https://api.mainnet-beta.solana.com';
const widgetUrl = 'https://widgets.streamflow.finance/widgets/airdrop-claim/airdrop-claim-0-0-1.js';

function validAddress(value: string) {
  try { return new PublicKey(value).toBase58() === value; } catch { return false; }
}

const configured = validAddress(distributorId) && validAddress(tokenMint) &&
  Number.isInteger(tokenDecimals) && tokenDecimals >= 0 && tokenDecimals <= 18 && /^https:\/\//.test(rpc);

export default function ClaimPanel() {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(configured);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!configured || !container.current) return;
    const host = container.current;
    const widget = document.createElement('sf-airdrop-claim');
    widget.setAttribute('name', 'Prisma');
    widget.setAttribute('distributor-id', distributorId);
    widget.setAttribute('endpoint', rpc);
    widget.setAttribute('token-decimals', String(tokenDecimals));
    widget.setAttribute('token-symbol', 'PRISMA');
    const script = document.createElement('script');
    script.type = 'module';
    script.src = widgetUrl;
    script.onload = () => setLoading(false);
    script.onerror = () => { setLoading(false); setFailed(true); };
    host.append(widget);
    document.head.append(script);
    return () => { widget.remove(); script.remove(); };
  }, []);

  return <main className="product-main claim-page">
    <div className="claim-heading"><span>PRISMA / TOKEN DISTRIBUTION</span><h1>Claim what’s yours.</h1><p>Connect a Solana wallet to check a published allocation. The distribution and its rules are verified onchain before any claim.</p></div>
    <div className="claim-grid">
      <section className="claim-card claim-card--primary" aria-label="Prisma token claim">
        <div className="claim-card__top"><span>01 / ELIGIBILITY</span><span>MAINNET · SOLANA</span></div>
        {configured ? <><h2>Check your allocation.</h2><div className="claim-widget" ref={container} />{loading && <p role="status">Loading claim interface…</p>}{failed && <p role="alert">The claim interface could not load. Please try again later.</p>}</> : <><h2>Claim opens with the distribution.</h2><p>The PRISMA mint, recipient allocations and distributor account have not been published. No wallet transaction is available yet.</p><div className="claim-pending"><i aria-hidden="true"/><span>Distribution not active</span></div></>}
      </section>
      <aside className="claim-card claim-card--details"><div className="claim-card__top"><span>02 / THE DETAILS</span><span>↗</span></div><div className="claim-rule"><span>Token</span><strong>{configured ? 'PRISMA' : 'Not announced'}</strong></div><div className="claim-rule"><span>Distributor</span><strong>{configured ? `${distributorId.slice(0, 6)}…${distributorId.slice(-6)}` : 'Not published'}</strong></div><div className="claim-rule"><span>Network</span><strong>Solana mainnet</strong></div><div className="claim-rule"><span>Claim cost</span><strong>Shown before signing</strong></div><p>Claiming uses Streamflow’s distribution program. Its current published recipient fee is 0.0237–0.0317 SOL per claim, plus any network costs shown in the wallet. Review the transaction before you approve it.</p></aside>
    </div>
  </main>;
}
