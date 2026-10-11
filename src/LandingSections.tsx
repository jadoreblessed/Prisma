import { useEffect, useState } from 'react';
import GlassButton from './GlassButton';
import { equityAssets, markets as marketData, tokenLogo } from './marketData';
import './LandingSections.css';
import './PrismaScenes.css';

const featured = [
  { symbol: 'SPY', pair: 'USDG', supplied: '$21.7K', supply: '0.00%', borrowed: '$555', borrow: '0.04%', age: '4h 17m' },
  { symbol: 'NVDA', pair: 'USDG', supplied: '$13.1K', supply: '0.00%', borrowed: '$39', borrow: '0.03%', age: '11h 59m' },
  { symbol: 'TSLA', pair: 'USDG', supplied: '$13.1K', supply: '0.00%', borrowed: '$2', borrow: '0.03%', age: '6h 17m' },
  { symbol: 'CRWV', pair: 'USDG', supplied: '$125', supply: '0.00%', borrowed: '$0', borrow: '0.09%', age: '48m' },
  { symbol: 'NBIS', pair: 'USDG', supplied: '$125', supply: '0.00%', borrowed: '$0', borrow: '0.07%', age: '25m' },
];
const steps = [
  ['Pick an isolated market', 'A market pairs one collateral token with a stablecoin, its own price feed and liquidation limit. Each market is considered separately.'],
  ['Post collateral', 'Your tokenized shares form the collateral for this position. The chosen market limit determines how much can be borrowed.'],
  ['Draw stablecoins', 'Borrow against the collateral up to the market limit. The amount you owe and the applicable rate remain visible together.'],
  ['Watch the price age', 'The underlying exchange can close while the position stays open. Prisma shows the age of its last price update beside the market.'],
];
function MarketPreview() {
  return <div className="ch-market-ui" aria-label="Illustrative market table"><div className="ch-market-head"><span>ASSET</span><span>TOTAL SUPPLIED ↓</span><span>SUPPLY APY</span><span>TOTAL BORROWED</span><span>BORROW APY</span><span>PRICE AGE</span></div>{featured.map((m,i)=><div className="ch-market-row" key={m.symbol} style={{'--row':i} as React.CSSProperties}><span className="ch-market-asset"><img src={tokenLogo(m.symbol)} alt=""/><span><b>{m.symbol}</b><small>vs {m.pair} · 62.5% limit</small></span></span><span>{m.supplied}</span><span className="ch-teal">{m.supply}</span><span>{m.borrowed}</span><span>{m.borrow}</span><span className="ch-red">{m.age}</span></div>)}</div>;
}
function PositionPreview(){return <div className="ch-position-ui" aria-label="Illustrative lend and borrow panel"><div className="ch-position-alert">The price behind this market last moved <b>4h 17m</b> ago. Review its age before acting.</div><div className="ch-position-panels"><div><strong>Lend USDG</strong><span>You supplied <b>—</b></span><span>In your wallet <b>—</b></span><span>Earning <b className="ch-teal">0.00%</b></span><span>Utilization <b>3%</b></span><div className="ch-position-input">0.00 <small>USDG</small></div><div className="ch-position-actions"><i>Supply</i><i>Withdraw</i></div></div><div><strong>Borrow against SPY</strong><span>Collateral posted <b>—</b></span><span>You owe <b>—</b></span><span>Paying <b className="ch-red">0.04%</b></span><span>Liquidated above <b>62.5%</b></span><div className="ch-position-input">0.00 <small>SPY</small></div><div className="ch-position-actions"><i>Add collateral</i><i>Remove</i></div></div></div></div>}
function AgePreview(){return <div className="ch-age-ui" aria-label="Illustrative position summary"><div><small>Total supplied</small><b>$21.7K</b></div><div><small>Total borrowed</small><b>$555</b></div><div><small>Utilization</small><b>3%</b></div><div><small>Price age</small><b className="ch-red">4h 17m</b></div></div>}
const signalMarkets = [
  {symbol:'SPY',name:'S&P 500 ETF',limit:'62.5%',age:'4h 17m',feed:'NYSE Arca',supply:'$21.7K',borrow:'$555'},
  {symbol:'NVDA',name:'NVIDIA',limit:'62.5%',age:'11h 59m',feed:'NASDAQ',supply:'$13.1K',borrow:'$39'},
  {symbol:'TSLA',name:'Tesla',limit:'62.5%',age:'6h 17m',feed:'NASDAQ',supply:'$13.1K',borrow:'$2'},
];
const ageMoments = [
  {day:'FRIDAY',time:'16:00',age:'00',unit:'hours',title:'The exchange closes.',detail:'The last published price is held. The position remains open.'},
  {day:'SATURDAY',time:'16:00',age:'24',unit:'hours',title:'The clock keeps going.',detail:'The displayed price is now a day old. The loan can keep accruing.'},
  {day:'SUNDAY',time:'16:00',age:'48',unit:'hours',title:'The quote stays still.',detail:'A still number does not mean the underlying asset stood still.'},
  {day:'MONDAY',time:'09:00',age:'65',unit:'hours',title:'The feed can catch up.',detail:'When the exchange reopens, the next update can arrive in one step.'},
];
function MarketSignal(){
  const [selected,setSelected]=useState(0);
  const market=signalMarkets[selected];
  return <section className="ledger reveal" aria-label="Illustrative market sheet">
    <div className="ledger-top"><span>PRISMA / MARKET SHEET</span><span>01 — READ THE MARKET</span></div>
    <div className="ledger-title"><div><span>ONE COLLATERAL. ONE BORROW ASSET.</span><h3>A market with<br/>nothing hidden.</h3></div><p>The useful numbers belong together. Select a market to see its collateral, loan limit and age of the last price update.</p></div>
    <div className="ledger-workspace">
      <div className="ledger-index"><div className="ledger-index-title">MARKET INDEX <span>03 / SAMPLE</span></div>{signalMarkets.map((item,i)=><button type="button" key={item.symbol} className={selected===i?'active':''} onClick={()=>setSelected(i)} aria-pressed={selected===i}><span className="ledger-index-no">0{i+1}</span><img src={tokenLogo(item.symbol)} alt=""/><span className="ledger-index-name"><b>{item.symbol}</b><small>{item.name}</small></span><span className="ledger-index-arrow" aria-hidden="true">↗</span></button>)}<small className="ledger-index-note">Tap a row to inspect the market.</small></div>
      <div className="ledger-sheet" key={market.symbol}><div className="ledger-sheet-top"><span>ISOLATED LENDING / {market.feed}</span><span>USDG MARKET</span></div><div className="ledger-pair"><img src={tokenLogo(market.symbol)} alt=""/><strong>{market.symbol}<span> / USDG</span></strong></div><div className="ledger-metrics"><div><span>COLLATERAL</span><b>{market.symbol}</b></div><div><span>LOAN LIMIT</span><b>{market.limit}</b></div><div><span>TOTAL SUPPLIED</span><b>{market.supply}</b></div><div><span>TOTAL BORROWED</span><b>{market.borrow}</b></div></div><div className="ledger-age"><span>PRICE UPDATED</span><strong>{market.age} ago</strong><span className="ledger-age-rule" aria-hidden="true"/></div></div>
    </div><div className="ledger-bottom"><span>FIGURES ARE ILLUSTRATIVE, NOT LIVE</span><span>ONE MARKET / ONE RISK PROFILE</span></div>
  </section>;
}
function PriceAgeScene(){
  const [active,setActive]=useState(0);
  const moment=ageMoments[active];
  useEffect(()=>{
    const node=document.querySelector('.disclosure');
    if(!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer:number|undefined;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting && timer===undefined) timer=window.setInterval(()=>setActive(index=>(index+1)%ageMoments.length),3600);
      else if(!entry.isIntersecting && timer!==undefined){window.clearInterval(timer);timer=undefined;}
    },{threshold:.3});
    observer.observe(node);
    return ()=>{observer.disconnect();if(timer!==undefined)window.clearInterval(timer);};
  },[]);
  return <section className="disclosure reveal" id="price-age" aria-label="Illustrative exchange weekend sequence"><div className="disclosure-top"><span>02 / THE TIME BETWEEN PRICES</span><span>FRIDAY → MONDAY</span></div><div className="disclosure-head"><span>PRICE AGE IN VIEW</span><h3>Markets close.<br/>Positions remain.</h3><p>The price behind a tokenized share can pause when its exchange closes. A loan can continue accruing while that number stays still.</p></div><div className="disclosure-stage"><div className="disclosure-hour" key={moment.age}><span>THE DISPLAYED PRICE IS</span><div><strong>{moment.age}</strong><em>hours<br/>old</em></div></div><div className="disclosure-event" key={moment.day}><span>{moment.day} / {moment.time}</span><h4>{moment.title}</h4><p>{moment.detail}</p></div></div><div className="disclosure-rail" role="group" aria-label="Choose a day of the weekend">{ageMoments.map((item,i)=><button type="button" key={item.day} className={active===i?'active':''} aria-pressed={active===i} onClick={()=>setActive(i)}><span className="disclosure-rail-line"/><span>{item.day}</span><small>{item.time}</small></button>)}</div><div className="disclosure-bottom"><span>PRISMA SHOWS THE AGE. THE DECISION STAYS YOURS.</span><span>ILLUSTRATIVE SEQUENCE</span></div></section>;
}
function Frame({children,kind}:{children:React.ReactNode;kind?:string}){return <div className={`ch-frame ch-frame--${kind||'default'} reveal`}><div className="ch-frame-inner">{children}</div></div>}
export default function LandingSections(){
  return <main className="ch-story" id="about">
    <div className="ch-wrap">
      <div className="ch-stats reveal" aria-label="Preview catalogue"><div><b>{equityAssets}</b><span>Equity assets in preview</span></div><div><b>{marketData.length}</b><span>Distinct assets shown</span></div><div><b>1</b><span>Clear view of every market</span></div></div>
      <section className="ch-how" id="how"><div className="ch-section-heading reveal"><h2>How it works</h2><p>Four steps, and one number that gives the position its context.</p></div><ol className="ch-steps reveal">{steps.map(([title,copy],i)=><li className="ch-step reveal" key={title} style={{'--order':i} as React.CSSProperties}><span className="ch-step-number">{String(i+1).padStart(2,'0')}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        <MarketSignal/>
        <PriceAgeScene/>
      </section>
      <section className="ch-features" id="one-view"><div className="ch-section-heading reveal"><h2>Everything in one view</h2><p>Three details a price alone cannot tell you.</p></div><div className="ch-feature-grid">
        <Frame kind="market"><MarketPreview/></Frame><div className="ch-feature-copy reveal"><h3>Every market, with its price age</h3><p>Browse assets, loan limits and rates in one table. Each row also shows how long ago the underlying price last moved.</p><a href="#/markets">View markets <span aria-hidden="true">↗</span></a></div>
        <div className="ch-feature-copy reveal"><h3>Lend and borrow side by side</h3><p>Supply stablecoins or post tokenized shares as collateral. The market’s limit and the position are visible together, before any action.</p><a href="#/markets">Explore the app <span aria-hidden="true">↗</span></a></div><Frame kind="position"><PositionPreview/></Frame>
        <Frame kind="age"><AgePreview/></Frame><div className="ch-feature-copy reveal"><h3>Told plainly when a price is old</h3><p>Price age sits beside the figures that matter. You can see the context and make your own decision.</p><GlassButton href="#/markets" arrow>Launch app</GlassButton></div>
      </div><p className="ch-disclaimer">Illustrative interface preview. Market figures, price ages and calculations are not live; wallet actions are not connected.</p></section>
    </div><footer className="ch-footer"><span>2026 PRISMA / INTERFACE PREVIEW</span><div><a href="#top">Back to top ↑</a><a href="#/docs">Docs</a><a href="#/faq">FAQ</a><a href="https://x.com/" target="_blank" rel="noopener noreferrer">X</a></div></footer>
  </main>;
}
