import { useEffect, useRef, useState } from 'react';
import GlassButton from './GlassButton';
import MarketAct from './MarketAct';
import { tokenLogo } from './marketData';
import './LandingSections.css';

const featured = [
  { symbol: 'SPY', pair: 'USDG', supplied: '$21.7K', supply: '0.00%', borrowed: '$555', borrow: '0.04%', age: '4h 17m' },
  { symbol: 'NVDA', pair: 'USDG', supplied: '$13.1K', supply: '0.00%', borrowed: '$39', borrow: '0.03%', age: '11h 59m' },
  { symbol: 'TSLA', pair: 'USDG', supplied: '$13.1K', supply: '0.00%', borrowed: '$2', borrow: '0.03%', age: '6h 17m' },
  { symbol: 'CRWV', pair: 'USDG', supplied: '$125', supply: '0.00%', borrowed: '$0', borrow: '0.09%', age: '48m' },
  { symbol: 'NBIS', pair: 'USDG', supplied: '$125', supply: '0.00%', borrowed: '$0', borrow: '0.07%', age: '25m' },
];
function MarketPreview() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .55 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const selected = hovered ?? (inView ? 'NVDA' : null);
  return <div ref={previewRef} className={`ch-market-ui${selected ? ' ch-market-ui--focused' : ''}`} aria-label="Illustrative market table" onPointerLeave={() => setHovered(null)}><div className="ch-market-head"><span>ASSET</span><span>TOTAL SUPPLIED ↓</span><span>SUPPLY APY</span><span>TOTAL BORROWED</span><span>BORROW APY</span><span>PRICE AGE</span></div>{featured.map((m,i)=><div className={`ch-market-row${selected === m.symbol ? ' ch-market-row--selected' : ''}`} key={m.symbol} style={{'--row':i} as React.CSSProperties} onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(m.symbol); }}><span className="ch-market-asset"><img src={tokenLogo(m.symbol)} alt=""/><span><b>{m.symbol}</b><small>vs {m.pair} · 62.5% limit</small></span></span><span>{m.supplied}</span><span className="ch-teal">{m.supply}</span><span>{m.borrowed}</span><span>{m.borrow}</span><span className="ch-red">{m.age}</span><span className="ch-row-detail">{m.symbol} / 62.5% limit / Price age {m.age}</span></div>)}</div>;
}
function PositionPreview(){return <div className="ch-position-ui" aria-label="Illustrative lend and borrow panel"><div className="ch-position-alert"><img src={tokenLogo('NVDA')} alt=""/> NVDA / USDG · The example price last moved <b>11h 59m</b> ago.</div><div className="ch-position-panels"><div><strong>Lend USDG</strong><span>You supplied <b>—</b></span><span>In your wallet <b>—</b></span><span>Earning <b className="ch-teal">0.00%</b></span><span>Utilization <b>3%</b></span><div className="ch-position-input">0.00 <small>USDG</small></div><div className="ch-position-actions"><i>Supply</i><i>Withdraw</i></div></div><div><strong>Borrow against NVDA</strong><span>Collateral posted <b>—</b></span><span>You owe <b>—</b></span><span>Paying <b className="ch-red">0.03%</b></span><span>Liquidated above <b>62.5%</b></span><div className="ch-position-input">0.00 <small>NVDA</small></div><div className="ch-position-actions"><i>Add collateral</i><i>Remove</i></div></div></div></div>}
function AgePreview(){
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [minutes, setMinutes] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setMinutes(719); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setMinutes(Math.min(719, Math.round(719 * Math.min(1, (now - start) / 3600))));
      if (now - start < 3600) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  return <div ref={ref} className={`ch-age-sequence${visible ? ' ch-age-sequence--playing' : ''}`} aria-label="Illustrative NVDA price age sequence"><div className="ch-age-ui"><div><small>NVDA / USDG</small><b>62.5% limit</b></div><div><small>Total supplied</small><b>$13.1K</b></div><div><small>Total borrowed</small><b>$39</b></div><div><small>Price age</small><b className="ch-red">{Math.floor(minutes / 60)}h {String(minutes % 60).padStart(2,'0')}m</b></div></div><div className="ch-price-track"><div className="ch-price-track-labels"><span>PRICE FEED</span><span>EXCHANGE CLOSED · PRICE HELD</span><span>UPDATE</span></div><svg viewBox="0 0 520 90" preserveAspectRatio="none" role="img" aria-label="Example price moves, holds while the exchange is closed, then updates"><path className="ch-price-grid" d="M0 71H520"/><path className="ch-price-line" d="M0 58L24 47L48 51L72 29L96 40L120 34L144 18L168 26L192 20L216 35H417L418 68L442 61L465 68L487 49L520 54"/><path className="ch-price-hold" d="M216 35H417V68"/><circle className="ch-price-marker" cx="216" cy="35" r="4"/><circle className="ch-price-update" cx="418" cy="68" r="4"/></svg><div className="ch-price-caption"><span>Last published price</span><span>Age advances while price stays still</span><span>Next update</span></div></div></div>;
}
function Frame({children,kind}:{children:React.ReactNode;kind?:string}){return <div className={`ch-frame ch-frame--${kind||'default'} reveal`}><div className="ch-frame-inner">{children}</div></div>}
export default function LandingSections({ xUrl }: { xUrl: string }){
  return <main className="ch-story" id="about">
    <MarketAct/>
    <div className="ch-wrap">
      <section className="ch-features" id="how"><div className="ch-section-heading reveal"><span className="ch-kicker">PRISMA / THE PRODUCT</span><h2>Everything in one view.</h2><p>An isolated market, your position and the age of its price — connected in one place.</p></div>
        <div className="ch-feature-row"><Frame kind="market"><MarketPreview/></Frame><div className="ch-feature-copy reveal"><span className="ch-feature-number">01 / THE MARKET</span><h3>One asset.<br/>One clear limit.</h3><p>Each market pairs a collateral token with a stablecoin, its own price feed and liquidation limit. Browse them together with supply and borrow rates.</p><a href="#/markets">View markets <span aria-hidden="true">↗</span></a></div></div>
        <div className="ch-feature-row"><div className="ch-feature-copy reveal"><span className="ch-feature-number">02 / THE POSITION</span><h3>Lend and borrow,<br/>side by side.</h3><p>Supply stablecoins or post tokenized shares as collateral. The amount you owe and the market limit remain visible before you act.</p><a href="#/markets">Explore the app <span aria-hidden="true">↗</span></a></div><Frame kind="position"><PositionPreview/></Frame></div>
        <div className="ch-feature-row"><Frame kind="age"><AgePreview/></Frame><div className="ch-feature-copy reveal"><span className="ch-feature-number">03 / THE CONTEXT</span><h3>The price has<br/>a timestamp.</h3><p>Underlying exchanges close. A displayed price can stay still while a loan continues to accrue. Prisma shows when that price last moved beside the position.</p><GlassButton href="#/markets" arrow>Launch app</GlassButton></div></div>
        <p className="ch-figure-note">The interface examples show sample figures. Check a market for its current reserve terms.</p>
      </section>
    </div><footer className="ch-footer"><span>© 2026 PRISMA</span><div><a href="#top">Back to top ↑</a><a href="#/docs">Docs</a><a href="#/faq">FAQ</a>{xUrl&&<a href={xUrl} target="_blank" rel="noopener noreferrer">X</a>}</div></footer>
  </main>;
}
