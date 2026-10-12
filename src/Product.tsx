import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown, Info } from 'lucide-react';
import GlassButton from './GlassButton';
import PrismaMark from './PrismaMark';
import './Product.css';

type KaminoMarket = {
  available: boolean;
  provider?: string;
  asset?: string;
  marketName?: string;
  marketAddress?: string;
  collateralReserve?: string;
  url?: string;
};

const nav = [['Markets', 'markets'], ['Vaults', 'vaults'], ['Stake', 'stake'], ['Claim', 'claim'], ['Docs', 'docs'], ['FAQ', 'faq']];
const KAMINO_HOME = 'https://kamino.com/borrow/';
const questions = [
  ['Where are transactions executed?', 'Kamino handles NVDAx supply, collateral, borrow and repay transactions in its existing xStocks market. Prisma does not deploy a lending program.'],
  ['Is Prisma creating a market?', 'No. Prisma points to the existing Kamino xStocks market. Creating a new market would require separate setup, liquidity, risk parameters and oracle integration.'],
  ['What does price age mean?', 'The time since the oracle report used by a market was published. Prisma does not show a live price age until it can verify the timestamp of the feed used by that market.'],
  ['Are rates and limits shown here live?', 'No rates, caps, limits or oracle ages are displayed on Prisma yet. Review current market terms on Kamino before signing.'],
];

function SectionTitle({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy: string }) {
  return <div className="product-section-title">{eyebrow && <span className="product-kicker">{eyebrow}</span>}<h1>{title}</h1><p>{copy}</p></div>;
}

export default function Product({ route }: { route: string }) {
  const [kamino, setKamino] = useState<KaminoMarket | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/kamino-market', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Kamino unavailable'); return response.json(); })
      .then((data: KaminoMarket) => setKamino(data))
      .catch(() => { if (!controller.signal.aborted) setKamino({ available: false }); });
    return () => controller.abort();
  }, []);

  const kaminoUrl = kamino?.available && kamino.url ? kamino.url : KAMINO_HOME;
  return <div className="product-page">
    <header className="product-header"><div className="product-header__inner">
      <a className="product-brand" href="#/" aria-label="Prisma home"><PrismaMark/><span>Prisma</span></a>
      <nav aria-label="Product navigation">{nav.map(([label, path]) => <a key={path} className={route === path ? 'active' : ''} href={'#/' + path}>{label}</a>)}</nav>
      <GlassButton href={kaminoUrl} className="product-connect" arrow>Open Kamino</GlassButton>
    </div></header>

    {route === 'markets' && <main className="product-main">
      <SectionTitle eyebrow="LIVE MARKET / KAMINO" title="NVDAx lending" copy="Explore tokenized equity lending on Solana. Prisma links to the existing Kamino xStocks market; transactions and wallet connection happen there." />
      <div className="product-live-market">
        <div className="product-live-market__top"><span className="product-kicker">NVIDIA xSTOCK</span><span className="product-live-market__status"><i />{kamino === null ? 'Checking market' : kamino.available ? 'Market found on Kamino' : 'Live lookup unavailable'}</span></div>
        <div className="product-live-market__body"><div><h2>NVDAx <span>/ xStocks Market</span></h2><p>Use NVDAx as collateral and review available borrowing options in Kamino’s market. Check the live asset mint, loan limit, rates and oracle status before signing.</p></div><a className="product-chain-submit product-partner-link" href={kaminoUrl} target="_blank" rel="noopener noreferrer">{kamino?.available ? 'Open this market' : 'Find NVDAx on Kamino'} <ArrowUpRight size={18}/></a></div>
        <div className="product-live-market__bottom"><span>PROTOCOL <strong>Kamino Lend</strong></span><span>NETWORK <strong>Solana mainnet</strong></span><span>PRICE AGE <strong>Not verified</strong></span></div>
      </div>
      <p className="product-disclaimer">Prisma does not show estimated rates, a price timestamp or liquidation thresholds for this market. A Pyth ticker timestamp may differ from the Chainlink feed used by Kamino.</p>
    </main>}

    {route === 'vaults' && <main className="product-main"><SectionTitle title="Vaults" copy="Vault discovery on existing protocols is being prepared. No Prisma vault accepts deposits."/><div className="product-empty-panel"><span>VAULT DIRECTORY</span><h2>No live vaults connected.</h2><p>Vault operators, allocation caps and withdrawal terms will appear here only after integration with verified protocol data.</p></div></main>}
    {route === 'stake' && <main className="product-main"><SectionTitle title="Stake Prisma" copy="The token address and staking program have not been announced."/><div className="product-alert"><span>CA COMING SOON</span><p>No staking contract is connected and this page cannot accept funds.</p></div></main>}
    {route === 'claim' && <main className="product-main"><SectionTitle title="Claim" copy="Claim eligibility and token distribution have not been announced."/><div className="product-alert"><span>CA COMING SOON</span><p>No claim contract is connected. Never send funds to an unverified token address.</p></div></main>}
    {route === 'docs' && <main className="product-main"><SectionTitle eyebrow="THE INTERFACE" title="How Prisma works" copy="Prisma helps you discover tokenized equity lending on existing Solana protocols."/><div className="product-info-grid">
      <article><h3>01 / Find a market</h3><p>We check Kamino’s public market directory for NVDAx in its xStocks market.</p></article>
      <article><h3>02 / Review the terms</h3><p>Open the market on Kamino and verify the asset, rates, collateral requirements and current liquidity.</p></article>
      <article><h3>03 / Act on Kamino</h3><p>Connect your wallet and sign any supply or borrow transaction on Kamino. Prisma does not custody assets.</p></article>
      <article><h3>04 / Price age</h3><p>This will appear only when the timestamp from the market’s actual oracle feed can be read and verified.</p></article>
    </div><GlassButton href="#/markets" arrow>Explore markets</GlassButton></main>}
    {route === 'faq' && <main className="product-main"><SectionTitle title="FAQ" copy="What is live, what remains in progress, and where transactions happen."/><div className="product-faq">{questions.map(([question, answer], index) => <div key={question} className={openFaq === index ? 'open' : ''}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>{question}<ChevronDown size={19}/></button>{openFaq === index && <p>{answer}</p>}</div>)}</div><p className="product-disclaimer"><Info size={15}/> Market availability and terms may change. Check Kamino before taking any position.</p></main>}
    <footer className="product-footer"><span>PRISMA / MARKET EXPLORER</span><a href="#/">BACK TO SITE <ArrowUpRight size={14}/></a></footer>
  </div>;
}
