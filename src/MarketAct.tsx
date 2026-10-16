import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { tokenLogo } from './marketData';
import './MarketAct.css';

const HeroShader = lazy(() => import('./HeroShader'));

const markets = [
  { symbol: 'SPY', name: 'S&P 500 ETF', pair: 'USDG', limit: '62.5%', supplied: '$21.7K', borrowed: '$555', age: '4h 17m' },
  { symbol: 'NVDA', name: 'NVIDIA', pair: 'USDG', limit: '62.5%', supplied: '$13.1K', borrowed: '$39', age: '11h 59m' },
  { symbol: 'TSLA', name: 'Tesla', pair: 'USDG', limit: '62.5%', supplied: '$13.1K', borrowed: '$2', age: '6h 17m' },
];
const moments = [
  { day: 'FRI', time: '16:00', hours: '00', status: 'Exchange closes', note: 'The last published price stays on screen.' },
  { day: 'SAT', time: '16:00', hours: '24', status: 'Price held', note: 'The position can remain open through the weekend.' },
  { day: 'SUN', time: '16:00', hours: '48', status: 'Time passes', note: 'A still quote is now two days old.' },
  { day: 'MON', time: '09:00', hours: '65', status: 'Feed resumes', note: 'The next update can arrive in one step.' },
];

export default function MarketAct() {
  const track = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pointerFrame = useRef<number | null>(null);
  const progressBar = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState(0);
  const [selected, setSelected] = useState(0);
  const [momentIndex, setMomentIndex] = useState(0);
  const [canUseShader] = useState(() => typeof navigator !== 'undefined' && 'gpu' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [shaderInRange, setShaderInRange] = useState(false);
  const market = markets[selected];
  const moment = moments[momentIndex];

  useEffect(() => {
    let pending = false;
    const update = () => {
      pending = false;
      const element = track.current;
      if (!element) return;
      const span = Math.max(1, element.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -element.getBoundingClientRect().top / span));
      if (progressBar.current) progressBar.current.style.transform = `scaleX(${progress})`;
      setPhase(current => current === Number(progress >= .52) ? current : Number(progress >= .52));
      const index = Math.min(3, Math.max(0, Math.floor((progress - .54) / .145)));
      setMomentIndex(current => current === index ? current : index);
    };
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, []);

  useEffect(() => () => {
    if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
  }, []);

  useEffect(() => {
    if (!canUseShader || !track.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShaderInRange(true); observer.disconnect(); } }, { rootMargin: '350px 0px' });
    observer.observe(track.current);
    return () => observer.disconnect();
  }, [canUseShader]);

  const moveLight = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || pointerFrame.current !== null) return;
    const { clientX, clientY } = event;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      const element = stage.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--light-x', `${((clientX - rect.left) / rect.width) * 100}%`);
      element.style.setProperty('--light-y', `${((clientY - rect.top) / rect.height) * 100}%`);
    });
  };

  const goToMoment = (index: number) => {
    const element = track.current;
    if (!element) return;
    const start = element.getBoundingClientRect().top + window.scrollY;
    const span = element.offsetHeight - window.innerHeight;
    window.scrollTo({ top: start + span * (.56 + index * .145), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return <section className="market-act-track" ref={track} aria-label="Prisma market and price age walkthrough">
    <span className="market-act-age-anchor" id="price-age" aria-hidden="true" />
    <div className={`market-act ${phase === 1 ? 'market-act--age' : ''}`} ref={stage} onPointerMove={moveLight} onPointerLeave={() => { if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current); pointerFrame.current = null; stage.current?.style.removeProperty('--light-x'); stage.current?.style.removeProperty('--light-y'); }}>
      <div className="market-act-background" aria-hidden="true">
        <div className="market-act-background-fallback" />
        {canUseShader && shaderInRange && <Suspense fallback={null}><HeroShader /></Suspense>}
      </div>
      <div className="market-act-progress"><span ref={progressBar} /></div>
      <header className="market-act-header"><span>{phase === 0 ? '01 / THE MARKET' : '02 / PRICE AGE'}</span></header>

      <div className="market-act-scene market-act-scene--market" aria-hidden={phase === 1}>
        <div className="market-act-copy"><span className="market-act-kicker">ONE ASSET / ONE LIMIT</span><h2>See the<br/>whole<br/><em>market.</em></h2><p>Before a position is opened: the collateral, borrow asset, loan limit and age of its price, all in one view.</p></div>
        <div className="market-act-board" aria-label="Illustrative market preview">
          <div className="market-act-board-top"><span>MARKET / {String(selected + 1).padStart(2, '0')}</span></div>
          <div className="market-act-identity" key={market.symbol}><img src={tokenLogo(market.symbol)} alt=""/><div><small>{market.name}</small><strong>{market.symbol}<span> / {market.pair}</span></strong></div></div>
          <div className="market-act-metrics"><div><small>LOAN LIMIT</small><b>{market.limit}</b></div><div><small>SUPPLIED</small><b>{market.supplied}</b></div><div><small>BORROWED</small><b>{market.borrowed}</b></div></div>
          <div className="market-act-age-line"><span>PRICE AGE</span><b>{market.age}</b><i aria-hidden="true"/></div>
          <div className="market-act-select" role="group" aria-label="Choose a market">{markets.map((item, index) => <button key={item.symbol} type="button" tabIndex={phase === 1 ? -1 : 0} aria-pressed={selected === index} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}><span>0{index + 1}</span>{item.symbol}<i aria-hidden="true">↗</i></button>)}</div>
        </div>
      </div>

      <div className="market-act-scene market-act-scene--age" aria-hidden={phase === 0}>
        <div className="market-act-copy"><span className="market-act-kicker">THE NUMBER BEHIND THE PRICE</span><h2>A quote<br/>can stop.<br/><em>Time won’t.</em></h2><p>When the underlying exchange closes, the last price may remain on screen. Prisma shows its age beside the market before you act.</p></div>
        <div className="market-act-clock"><div className="market-act-hours" key={moment.hours}><strong>{moment.hours}</strong><span>HOURS<br/>OLD</span></div><div className="market-act-status"><span>{moment.day} / {moment.time}</span><b>{moment.status}</b><p>{moment.note}</p></div><div className="market-act-days" role="group" aria-label="Choose a point in time">{moments.map((item, index) => <button key={item.day} type="button" tabIndex={phase === 0 ? -1 : 0} aria-pressed={momentIndex === index} onClick={() => goToMoment(index)} className={momentIndex === index ? 'active' : ''}><i aria-hidden="true"/><span>{item.day}</span><small>{item.time}</small></button>)}</div></div>
      </div>

      <footer className="market-act-footer"><div className="market-act-tape" aria-hidden="true"><div className="market-act-tape-track"><span>COLLATERAL&nbsp; / &nbsp;BORROW ASSET&nbsp; / &nbsp;LOAN LIMIT&nbsp; / &nbsp;PRICE AGE&nbsp; / &nbsp;COLLATERAL&nbsp; / &nbsp;BORROW ASSET&nbsp; / &nbsp;LOAN LIMIT&nbsp; / &nbsp;PRICE AGE&nbsp; / &nbsp;</span><span>COLLATERAL&nbsp; / &nbsp;BORROW ASSET&nbsp; / &nbsp;LOAN LIMIT&nbsp; / &nbsp;PRICE AGE&nbsp; / &nbsp;COLLATERAL&nbsp; / &nbsp;BORROW ASSET&nbsp; / &nbsp;LOAN LIMIT&nbsp; / &nbsp;PRICE AGE&nbsp; / &nbsp;</span></div></div></footer>
    </div>
  </section>;
}
