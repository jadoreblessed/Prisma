import { useEffect, useState } from 'react';
import GlassButton from './GlassButton';
import ParticleField from './ParticleField';
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
  return <section className="signal-scene reveal" aria-label="Illustrative market context">
    <ParticleField/>
    <div className="signal-grain" aria-hidden="true"/>
    <div className="signal-head"><span>01 / MARKET CONTEXT</span><span>PRISMA — INTERFACE PREVIEW</span></div>
    <div className="signal-body"><div className="signal-intro"><span className="signal-kicker"><i/> THE WHOLE POSITION</span><h3>Clarity lives<br/>in the <em>details.</em></h3><p>Choose a market. Its asset, lending activity, limit and price age come into focus together.</p><div className="signal-tabs" role="group" aria-label="Select a market">{signalMarkets.map((item,i)=><button type="button" key={item.symbol} className={selected===i?'active':''} aria-pressed={selected===i} onClick={()=>setSelected(i)}><img src={tokenLogo(item.symbol)} alt=""/>{item.symbol}<span>↗</span></button>)}</div></div>
    <div className="signal-display" key={market.symbol}><div className="signal-scan" aria-hidden="true"/><div className="signal-display-top"><span>MARKET / {String(selected+1).padStart(2,'0')}</span><span className="signal-live"><i/> SAMPLE DATA</span></div><div className="signal-asset"><img src={tokenLogo(market.symbol)} alt=""/><div><span>TOKENIZED EQUITY / {market.feed}</span><strong>{market.symbol}<small> / USDG</small></strong><p>{market.name}</p></div></div><div className="signal-divider"/><div className="signal-values"><div><span>LOAN LIMIT</span><b>{market.limit}</b></div><div><span>TOTAL SUPPLIED</span><b>{market.supply}</b></div><div><span>TOTAL BORROWED</span><b>{market.borrow}</b></div></div><div className="signal-age"><div><span>LAST PRICE UPDATE</span><strong>{market.age} ago</strong></div><div className="signal-pulse" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></div></div>
    <div className="signal-foot"><span>ISOLATED MARKET / ONE COLLATERAL / ONE LIMIT</span><span>SELECT A MARKET ABOVE ↑</span></div>
  </section>;
}
function PriceAgeScene(){
  const [active,setActive]=useState(0);
  const moment=ageMoments[active];
  useEffect(()=>{
    const node=document.querySelector('.age-scene');
    if(!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer:number|undefined;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting && timer===undefined) timer=window.setInterval(()=>setActive(index=>(index+1)%ageMoments.length),3200);
      else if(!entry.isIntersecting && timer!==undefined){window.clearInterval(timer);timer=undefined;}
    },{threshold:.35});
    observer.observe(node);
    return ()=>{observer.disconnect();if(timer!==undefined)window.clearInterval(timer);};
  },[]);
  return <section className="age-scene reveal" id="price-age" aria-label="Illustrative price age sequence"><div className="age-noise" aria-hidden="true"/><div className="age-top"><span>02 / PRICE AGE</span><span>AN EXCHANGE HAS HOURS. A POSITION DOESN’T.</span></div><div className="age-layout"><div className="age-editorial"><span className="age-small">WHY THE AGE MATTERS</span><h3>A price can pause.<br/><em>Your position doesn’t.</em></h3><p>When the exchange closes, the last price may stay on screen while a loan continues to accrue. Prisma places its age beside the market, before you act.</p></div><div className="age-clock" aria-live="polite"><div className="age-clock-head"><span>LAST PUBLISHED PRICE</span><span>FRI / 16:00</span></div><div className="age-digits" key={moment.age}><strong>{moment.age}</strong><span>{moment.unit}<i>OLD</i></span></div><div className="age-orbit" aria-hidden="true"/><div className="age-clock-caption"><span>{moment.day} · {moment.time}</span><strong>{moment.title}</strong><p>{moment.detail}</p></div></div></div><div className="age-diagrams" aria-label="Three parts of a Prisma market"><div className="age-diagram"><div className="age-diagram-art age-diagram-orbit" aria-hidden="true"><i/><i/><i/><i/><b/></div><span>01 / MARKET</span><h4>Isolated by design</h4><p>Each collateral asset has its own borrow asset, price feed and loan limit.</p></div><div className="age-diagram"><div className="age-diagram-art age-diagram-depth" aria-hidden="true"><i/><i/><i/><i/><i/><b/></div><span>02 / POSITION</span><h4>Lend and borrow</h4><p>Supply stablecoins or post tokenized shares and borrow against them.</p></div><div className="age-diagram"><div className="age-diagram-art age-diagram-flow" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{'--line':i} as React.CSSProperties}/>)}</div><span>03 / PRICE AGE</span><h4>Time in view</h4><p>See when the price behind a market last moved before deciding.</p></div></div><div className="age-timeline" role="group" aria-label="Weekend price age timeline">{ageMoments.map((item,i)=><button type="button" key={item.day} className={active===i?'active':''} aria-pressed={active===i} onClick={()=>setActive(i)}><span className="age-timeline-dot"/><span>{item.day}</span><small>{item.time}</small></button>)}</div><div className="age-bottom"><span>ONE PRICE HELD / TIME VISIBLE</span><span>ILLUSTRATIVE WEEKEND SEQUENCE</span></div></section>;
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
