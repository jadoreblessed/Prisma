import { useState } from 'react';
import GlassButton from './GlassButton';
import { tokenLogo } from './marketData';
import './LandingSections.css';

const markets = [
  { symbol: 'NVDA', pair: 'USDG', limit: '62.5%', age: '1h 30m' },
  { symbol: 'SPY', pair: 'USDG', limit: '62.5%', age: '18h 07m' },
  { symbol: 'TSLA', pair: 'USDG', limit: '62.5%', age: '57m' },
];

const steps = [
  { number: '01', title: 'Choose a market', copy: 'Each collateral asset has its own borrow asset, oracle and liquidation limit.' },
  { number: '02', title: 'Supply or borrow', copy: 'Lend stablecoins to earn, or post tokenized shares and borrow against them.' },
  { number: '03', title: 'Keep the context', copy: 'Rates, loan limit and the age of the underlying price stay in the same view.' },
];

function MarketTable() {
  return <div className="editorial-table" aria-label="Illustrative Prisma markets">
    <div className="editorial-table__header"><span>MARKET</span><span>LOAN LIMIT</span><span>PRICE AGE</span><span aria-hidden="true">↗</span></div>
    {markets.map((market) => <a className="editorial-table__row" href="#/markets" key={market.symbol}>
      <span className="editorial-table__asset"><img src={tokenLogo(market.symbol)} alt=""/><span><strong>{market.symbol}</strong><small>vs {market.pair}</small></span></span>
      <span>{market.limit}</span><span className="editorial-table__age">{market.age}</span><span aria-hidden="true">↗</span>
    </a>)}
    <div className="editorial-table__note">ILLUSTRATIVE SNAPSHOT / EXPLORE THE FULL MARKET LIST IN THE APP</div>
  </div>;
}

function PriceTimeline() {
  return <div className="editorial-timeline reveal" role="img" aria-label="Illustrative weekend price gap: the price can remain unchanged while a loan continues accruing">
    <div className="editorial-timeline__top"><span>THE UNDERLYING PRICE</span><span>FRIDAY CLOSE → MONDAY OPEN</span></div>
    <svg viewBox="0 0 1000 330" preserveAspectRatio="none" aria-hidden="true">
      <path className="timeline-grid" d="M0 52H1000 M0 135H1000 M0 218H1000 M0 300H1000"/>
      <path className="timeline-before" d="M0 186 50 170 110 185 165 138 225 151 277 120 335 137"/>
      <path className="timeline-held" d="M335 137H760V240"/>
      <path className="timeline-after" d="M760 240 810 229 865 246 920 211 1000 228"/>
      <circle cx="335" cy="137" r="6" fill="#f2eee7"/>
      <circle cx="760" cy="240" r="7" fill="#ff693a"/>
    </svg>
    <div className="editorial-timeline__band"><span>65 HOURS</span><small>ONE PRICE, UNCHANGED</small></div>
    <div className="editorial-timeline__days"><span>FRI</span><span>SAT</span><span>SUN</span><span>MON</span></div>
  </div>;
}

export default function LandingSections() {
  const [borrow, setBorrow] = useState(400);
  const liquidationValue = Math.round(borrow / .625);
  const priceCushion = Math.max(0, 100 - Math.round(liquidationValue / 10));
  return <main className="prisma-story" id="about">
    <section className="editorial-opening reveal">
      <div className="editorial-kicker"><span>01 / THE MARKET</span><span>PRISMA</span></div>
      <div className="editorial-opening__body"><h2>One market.<br/><em>One clear risk.</em></h2><p>An isolated market brings the asset, stablecoin, oracle and loan limit together. You see the terms of a position before you enter it.</p></div>
      <div className="editorial-opening__baseline"><span>COLLATERAL</span><span>ORACLE</span><span>LIMIT</span><span>LOAN</span></div>
    </section>

    <section className="editorial-market reveal" aria-labelledby="markets-heading">
      <div className="editorial-market__aside"><span className="editorial-index">A / 03</span><h3 id="markets-heading">The whole market<br/>in one view.</h3><p>Every row is a separate market. Each has its own limit and the age of the price behind it.</p><a href="#/markets" className="editorial-text-link">VIEW ALL MARKETS <span>↗</span></a></div>
      <MarketTable/>
    </section>

    <section className="editorial-steps" aria-labelledby="steps-heading"><div className="editorial-steps__head reveal"><span className="editorial-index">B / 03</span><h2 id="steps-heading">A position, from<br/>start to finish.</h2><p>Everything needed to understand a loan stays in the same place.</p></div><div className="editorial-steps__list">{steps.map((step) => <article className="editorial-step reveal" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.copy}</p><b aria-hidden="true">↗</b></article>)}</div></section>

    <section className="editorial-age" id="price-age" aria-labelledby="age-heading"><div className="editorial-age__heading reveal"><span className="editorial-index">C / 03&nbsp; THE PRICE FEED</span><h2 id="age-heading">The price does not<br/>go stale slowly.<br/><em>It stops.</em></h2><p>A tokenized share can keep trading while the exchange behind its price is closed. The next update may arrive in one step. Prisma shows how old that price is before you make a decision.</p></div><PriceTimeline/><div className="editorial-age__figures reveal"><div><strong>65h</strong><span>PRICE HELD</span></div><div><strong>0h</strong><span>INTEREST PAUSED</span></div><div><strong>1 step</strong><span>PRICE CATCH-UP</span></div></div><p className="editorial-age__footnote">Illustrative weekend scenario. A displayed price age is context, not a prediction of the next price.</p></section>

    <section className="editorial-position" id="one-view"><div className="editorial-position__intro reveal"><span className="editorial-index">POSITION STUDY / 01</span><h2>Move the amount.<br/><em>See the distance.</em></h2><p>Test a simple $1,000 collateral position against a 62.5% market limit. The figures update as you move the amount.</p></div><div className="editorial-position__tool reveal"><div className="editorial-position__input"><span>YOU BORROW</span><output htmlFor="borrow-range">${borrow}</output><input id="borrow-range" type="range" min="0" max="625" step="5" value={borrow} aria-label="Amount borrowed" onChange={(event) => setBorrow(Number(event.target.value))} style={{ '--progress': (borrow / 625 * 100) + '%' } as React.CSSProperties}/><div><span>$0</span><span>$625 MAX</span></div></div><div className="editorial-position__readout"><div><span>LIQUIDATION VALUE</span><strong>${liquidationValue}</strong></div><div><span>PRICE CUSHION</span><strong>{priceCushion}%</strong></div><div><span>PRICE AGE</span><strong>IN VIEW</strong></div></div></div><p className="editorial-position__note">Illustrative calculation, not live market data. The app does not connect to contracts or an oracle yet.</p></section>

    <footer className="editorial-end"><div className="editorial-end__line"><span>PRISMA / ISOLATED EQUITY LENDING</span><a href="#top">BACK TO TOP ↑</a></div><div className="editorial-end__body reveal"><h2>The full position,<br/><em>before you sign.</em></h2><GlassButton href="#/markets" arrow>Explore markets</GlassButton></div><div className="editorial-end__bottom"><span>PRISMA © 2026</span><span>ONE MARKET AT A TIME</span></div></footer>
  </main>;
}
