import { useState } from 'react';
import { ArrowUpRight, Sparkles, Activity, ShieldCheck, Clock3, Layers3 } from 'lucide-react';
import GlassButton from './GlassButton';
import PrismaMark from './PrismaMark';
import { tokenLogo } from './marketData';
import './LandingSections.css';

const steps = [
  ['01','Choose a market','An equity token, stablecoin, oracle and loan limit.'],
  ['02','Post collateral','Keep exposure to the share while it backs your loan.'],
  ['03','Borrow stablecoins','Draw against the position, up to its market limit.'],
  ['04','Watch price age','Know when the price behind the loan last moved.'],
];
function Tag({children}:{children:string}){return <span className="story-tag"><Sparkles size={12} strokeWidth={1.5}/>{children}<Sparkles size={12} strokeWidth={1.5}/></span>}
function MarketSnippet(){
  return <div className="story-market-table" aria-hidden="true"><div className="story-market-head"><span>MARKET</span><span>LIMIT</span><span>PRICE AGE</span></div>{[['NVDA','62.5%','11h 59m'],['SPY','62.5%','4h 17m'],['TSLA','62.5%','6h 17m']].map(([symbol,limit,age])=><div className="story-market-row" key={symbol}><span><img src={tokenLogo(symbol)} alt=""/>{symbol}<small>/ USDG</small></span><span>{limit}</span><b>{age}</b></div>)}</div>;
}
function GapChart(){
  return <div className="story-gap" role="img" aria-label="The price pauses over the weekend while the loan continues accruing"><div className="story-gap__days"><span>FRI</span><span>SAT</span><span>SUN</span><span>MON</span></div><svg viewBox="0 0 660 170" preserveAspectRatio="none" aria-hidden="true"><path d="M0 93 40 70 84 89 125 58 171 68 215 52 245 60" fill="none" stroke="#eee" strokeWidth="3" strokeLinejoin="round"/><path d="M245 60H510V140" fill="none" stroke="#ff9a79" strokeWidth="3" strokeDasharray="4 7"/><path d="M510 140 554 126 602 143 660 118" fill="none" stroke="#eee" strokeWidth="3" strokeLinejoin="round"/><path d="M245 60 510 36" fill="none" stroke="#ffffff70" strokeDasharray="3 6"/><circle cx="245" cy="60" r="5" fill="#fff"/><circle cx="510" cy="140" r="5" fill="#ff9a79"/></svg><span className="story-gap__hold">65H / ONE PRICE</span></div>;
}
export default function LandingSections(){
  const [borrow,setBorrow]=useState(400);
  const liquidated=Math.round(borrow/.625);
  const cushion=100-Math.round(liquidated/10);
  return <section className="prisma-story" id="about"><div className="prisma-story__inner">
    <div className="prisma-story__header reveal"><div><span className="story-eyebrow">THE PRISMA INTERFACE / 01—03</span><h2>Everything around the position.<br/><em>Nothing left to guess.</em></h2><p>One isolated market at a time. See the collateral, loan limit and age of the underlying price together before you act.</p></div><GlassButton href="#/markets" arrow>Explore markets</GlassButton></div>
    <div className="story-grid">
      <article className="story-card story-card--steps reveal"><div className="story-orbit" aria-hidden="true"><span/><span/><PrismaMark/></div><div className="story-card__top"><Tag>HOW IT WORKS</Tag></div><div className="story-steps">{steps.map(([n,title,copy])=><div className="story-step" key={n}><span>{n}</span><div><strong>{title}</strong><small>{copy}</small></div></div>)}</div></article>
      <div className="story-stack">
        <article className="story-card story-card--voice noise-overlay reveal" id="price-age"><Tag>WHY PRICE AGE MATTERS</Tag><h3>The price does not go stale slowly. <em>It stops.</em></h3><p>The exchange can close while a loan keeps accruing. Friday’s price may remain in place until the next session catches up in one step.</p><span className="story-card__foot">THE AGE STAYS IN VIEW <ArrowUpRight size={15}/></span></article>
        <article className="story-card story-card--gap reveal"><div className="story-card__top"><Tag>THE WEEKEND GAP</Tag></div><GapChart/><p>65 hours held. 0 hours of interest paused.</p></article>
      </div>
      <div className="story-stack">
        <article className="story-card story-card--markets reveal"><div className="story-card__top"><Tag>EVERY MARKET IN ONE VIEW</Tag></div><MarketSnippet/><p>Asset, rate, limit and price age — side by side.</p><a href="#/markets" className="story-card__link">View all markets <ArrowUpRight size={18}/></a></article>
        <article className="story-card story-card--action noise-overlay reveal"><div className="story-card__action-head"><Tag>YOUR POSITION</Tag><PrismaMark/></div><h3>One clear<br/>risk.</h3><p>Supply, borrow and monitor a single market without losing the context behind your decision.</p><GlassButton href="#/markets" arrow>Open the app</GlassButton></article>
      </div>
    </div>
    <div className="story-bottom" id="one-view"><div className="story-bottom__head"><div><span className="story-eyebrow">A LIMIT YOU CAN SEE</span><h3>Move the amount. See the cushion.</h3></div><p>Illustrative $1,000 collateral position, with a 62.5% market liquidation limit.</p></div><div className="story-bottom__body"><div className="story-bottom__controls"><div className="story-bottom__borrow"><span>YOU BORROW</span><strong>${borrow}</strong></div><input aria-label="Amount borrowed" type="range" min="0" max="625" step="5" value={borrow} onChange={e=>setBorrow(Number(e.target.value))} style={{'--progress':String(borrow/625*100)+'%'} as React.CSSProperties}/><div className="story-bottom__range"><span>$0</span><span>$625 max</span></div></div><div className="story-bottom__metrics"><div><ShieldCheck size={19}/><span>LIQUIDATION VALUE</span><strong>${liquidated}</strong></div><div><Activity size={19}/><span>PRICE CUSHION</span><strong>{cushion}%</strong></div><div><Clock3 size={19}/><span>PRICE AGE</span><strong>Visible</strong></div></div></div><p className="story-bottom__disclaimer">Illustrative figures. The app does not connect to live contracts or an oracle yet.</p></div>
    <div className="story-footer"><span><Layers3 size={17}/> PRISMA / ISOLATED EQUITY MARKETS</span><a href="#top">BACK TO TOP ↑</a></div>
  </div></section>;
}
