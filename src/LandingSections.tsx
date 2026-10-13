import GlassButton from './GlassButton';
import MarketAct from './MarketAct';
import { equityAssets, markets as marketData, tokenLogo } from './marketData';
import './LandingSections.css';

const featured = [
  { symbol: 'SPY', pair: 'USDG', supplied: '$21.7K', supply: '0.00%', borrowed: '$555', borrow: '0.04%', age: '4h 17m' },
  { symbol: 'NVDA', pair: 'USDG', supplied: '$13.1K', supply: '0.00%', borrowed: '$39', borrow: '0.03%', age: '11h 59m' },
  { symbol: 'TSLA', pair: 'USDG', supplied: '$13.1K', supply: '0.00%', borrowed: '$2', borrow: '0.03%', age: '6h 17m' },
  { symbol: 'CRWV', pair: 'USDG', supplied: '$125', supply: '0.00%', borrowed: '$0', borrow: '0.09%', age: '48m' },
  { symbol: 'NBIS', pair: 'USDG', supplied: '$125', supply: '0.00%', borrowed: '$0', borrow: '0.07%', age: '25m' },
];
function MarketPreview() {
  return <div className="ch-market-ui" aria-label="Illustrative market table"><div className="ch-market-head"><span>ASSET</span><span>TOTAL SUPPLIED ↓</span><span>SUPPLY APY</span><span>TOTAL BORROWED</span><span>BORROW APY</span><span>PRICE AGE</span></div>{featured.map((m,i)=><div className="ch-market-row" key={m.symbol} style={{'--row':i} as React.CSSProperties}><span className="ch-market-asset"><img src={tokenLogo(m.symbol)} alt=""/><span><b>{m.symbol}</b><small>vs {m.pair} · 62.5% limit</small></span></span><span>{m.supplied}</span><span className="ch-teal">{m.supply}</span><span>{m.borrowed}</span><span>{m.borrow}</span><span className="ch-red">{m.age}</span></div>)}</div>;
}
function PositionPreview(){return <div className="ch-position-ui" aria-label="Illustrative lend and borrow panel"><div className="ch-position-alert">The price behind this market last moved <b>4h 17m</b> ago. Review its age before acting.</div><div className="ch-position-panels"><div><strong>Lend USDG</strong><span>You supplied <b>—</b></span><span>In your wallet <b>—</b></span><span>Earning <b className="ch-teal">0.00%</b></span><span>Utilization <b>3%</b></span><div className="ch-position-input">0.00 <small>USDG</small></div><div className="ch-position-actions"><i>Supply</i><i>Withdraw</i></div></div><div><strong>Borrow against SPY</strong><span>Collateral posted <b>—</b></span><span>You owe <b>—</b></span><span>Paying <b className="ch-red">0.04%</b></span><span>Liquidated above <b>62.5%</b></span><div className="ch-position-input">0.00 <small>SPY</small></div><div className="ch-position-actions"><i>Add collateral</i><i>Remove</i></div></div></div></div>}
function AgePreview(){return <div className="ch-age-ui" aria-label="Illustrative position summary"><div><small>Total supplied</small><b>$21.7K</b></div><div><small>Total borrowed</small><b>$555</b></div><div><small>Utilization</small><b>3%</b></div><div><small>Price age</small><b className="ch-red">4h 17m</b></div></div>}
function Frame({children,kind}:{children:React.ReactNode;kind?:string}){return <div className={`ch-frame ch-frame--${kind||'default'} reveal`}><div className="ch-frame-inner">{children}</div></div>}
export default function LandingSections({ xUrl }: { xUrl: string }){
  return <main className="ch-story" id="about">
    <div className="ch-wrap">
      <div className="ch-stats reveal" aria-label="Market catalogue"><div><b>{equityAssets}</b><span>Tokenized equity assets</span></div><div><b>{marketData.length}</b><span>Assets in the catalogue</span></div><div><b>1</b><span>Clear view of each market</span></div></div>
    </div>
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
