import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import PrismaMark from './PrismaMark';
import { tokenLogo } from './marketData';
import './DigilabLanding.css';

const APP = '#/markets';
const palette = ['#b98aff', '#ff5a3d', '#24a676'];
const steps = [
  { n: '01', icon: '◇', title: 'Choose a market', body: 'Each isolated market has its own collateral asset, borrow asset, oracle and liquidation limit.' },
  { n: '02', icon: '◈', title: 'Lend or borrow', body: 'Supply stablecoins to earn, or post tokenized equity as collateral and borrow against it.' },
  { n: '03', icon: '◎', title: 'See the price age', body: 'Read when the price behind the market last moved before making a decision.' },
];
const details = [
  { title: 'Isolated markets', body: 'Every collateral and borrow pair is its own market. The asset, oracle and loan limit remain visible together.' },
  { title: 'Supply and borrow', body: 'Lending and borrowing sit side by side, so a position can be understood before any transaction is signed.' },
  { title: 'Price age in view', body: 'A tokenized share may trade while the underlying price feed is paused. Prisma shows the age of that price at the point of decision.' },
  { title: 'A clear liquidation limit', body: 'The market limit tells you how much of a collateral position can support a loan. The interactive example is illustrative.' },
];
const symbols = ['NVDA', 'SPY', 'TSLA', 'AAPL', 'GOOGL', 'MSFT', 'COIN', 'AMZN'];

function random(seed: number) {
  let value = seed >>> 0;
  return () => { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
}

function MarketTerrain({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const render = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      const r = random(1628);
      ctx.lineWidth = .65;
      for (let i = -8; i < 21; i++) {
        ctx.beginPath();
        for (let x = -50; x <= width + 50; x += 5) {
          const y = height * .46 + i * 29 + Math.sin(x / 118 + i * .28) * 49 + Math.sin(x / 54 + i * .17) * 10;
          if (x === -50) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(83,75,69,.16)' : 'rgba(83,75,69,.09)';
        ctx.stroke();
      }
      // Tiny outlined crowns form topographic forest clusters, rather than a flat noise texture.
      for (let i = 0; i < 105; i++) {
        const cx = r() * (width + 100) - 50, cy = r() * (height + 140) - 70;
        const rx = 16 + r() * 54, ry = 13 + r() * 50;
        const leaves = Math.round(220 + r() * 490);
        ctx.beginPath();
        for (let j = 0; j < leaves; j++) {
          const angle = r() * Math.PI * 2, radius = Math.sqrt(r());
          const x = cx + Math.cos(angle) * radius * rx, y = cy + Math.sin(angle) * radius * ry;
          const size = .45 + r() * 1.55;
          ctx.moveTo(x + size, y);
          ctx.arc(x, y, size, 0, Math.PI * 2);
        }
        ctx.strokeStyle = `rgba(66,62,59,${(.16 + r() * .13).toFixed(3)})`;
        ctx.lineWidth = .55;
        ctx.stroke();
        if (i % 6 === 0) {
          ctx.strokeStyle = 'rgba(82,75,70,.2)';
          ctx.strokeRect(cx - rx * .6, cy + ry * .85, rx * 1.2, ry * .9);
        }
      }
      for (let i = 0; i < 12; i++) {
        const x = r() * width, y = r() * height;
        ctx.strokeStyle = 'rgba(61,55,54,.16)';
        ctx.strokeRect(x, y, 18 + r() * 80, 18 + r() * 60);
      }
    };
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={ref} className={`dl-terrain ${className}`} aria-hidden="true" />;
}

function Pill({ href, children, dark = false, arrow = false }: { href: string; children: React.ReactNode; dark?: boolean; arrow?: boolean }) {
  return <a className={`dl-pill ${dark ? 'dl-pill--dark' : ''}`} href={href}>{children}{arrow && <span aria-hidden="true">▶</span>}</a>;
}

function MarketVisual({ active }: { active: number }) {
  const labels = active === 0 ? ['NVDA', 'SPY', 'TSLA'] : active === 1 ? ['USDG', 'COLLATERAL', 'BORROW'] : ['FRI', 'SAT', 'SUN', 'MON'];
  return <div className={`dl-visual dl-visual--${active}`} aria-hidden="true">
    <div className="dl-visual__lines">{Array.from({ length: 6 }, (_, i) => <span key={i} style={{ left: `${13 + i * 15}%`, color: palette[i % 3], animationDelay: `${i * .18}s` }}><i /></span>)}</div>
    <div className="dl-visual__rings"><span /><span /><span /></div>
    <div className="dl-visual__readout"><small>{active === 2 ? 'PRICE AGE' : active === 1 ? 'ONE POSITION' : 'ISOLATED MARKET'}</small><strong>{active === 2 ? '4h 17m' : active === 1 ? '62.5% LIMIT' : 'NVDA / USDG'}</strong><small>{active === 2 ? 'LAST ORACLE UPDATE' : active === 1 ? 'BORROW CAPACITY' : 'COLLATERAL / LOAN'}</small></div>
    <div className="dl-visual__labels">{labels.map((label, i) => <span key={label} style={{ left: `${12 + i * (active === 2 ? 23 : 32)}%` }}>{label}</span>)}</div>
  </div>;
}

export default function DigilabLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [openDetail, setOpenDetail] = useState<number | null>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * .68);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-step]');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) setActiveStep(Number((entry.target as HTMLElement).dataset.step));
    }), { rootMargin: '-35% 0px -40% 0px' });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);
  const nav = [['WHAT WE DO', '#what-we-do'], ['OUR MARKETS', '#markets'], ['HOW IT WORKS', '#how-it-works'], ['PRICE AGE', '#price-age'], ['FAQ', '#faq']];
  return <div className="dl-site" id="top">
    <header className={`dl-nav ${scrolled ? 'dl-nav--visible' : ''}`}><a className="dl-brand" href="#top"><PrismaMark />Prisma</a><nav aria-label="Primary navigation">{nav.map(([label, href]) => <a key={label} href={href}>{label}</a>)}<Pill href={APP}>LAUNCH APP</Pill></nav><button className="dl-menu-button" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={23} /></button></header>
    <div className={`dl-mobile-menu ${menu ? 'is-open' : ''}`} aria-hidden={!menu}><div className="dl-mobile-menu__head"><span>Prisma</span><button aria-label="Close navigation" onClick={() => setMenu(false)}><X size={23}/></button></div>{nav.map(([label, href]) => <a key={label} href={href} onClick={() => setMenu(false)}>{label}<span>↗</span></a>)}<a href={APP} onClick={() => setMenu(false)}>LAUNCH APP<span>↗</span></a></div>
    <section className="dl-intro" aria-label="Prisma intro"><MarketTerrain className="dl-intro__terrain" /><div className="dl-intro__wash"/><div className="dl-intro__copy"><span className="dl-intro__brand">Prisma</span><h1>Isolated markets<br/>for tokenized<br/>equities</h1><Pill href="#what-we-do" arrow>DISCOVER PRISMA</Pill></div><span className="dl-intro__index">01 / 04</span></section>
    <section className="dl-overview" id="what-we-do"><MarketTerrain /><div className="dl-overview__markers" aria-hidden="true">{Array.from({length:19}, (_, i) => <i key={i} style={{left:`${8 + ((i * 41) % 86)}%`,top:`${13 + ((i * 29) % 75)}%`,background:palette[i % 3]}} />)}</div><div className="dl-overview__content"><h2>Prisma brings lending, borrowing and price context together in one isolated market.</h2><div className="dl-overview__key"><span>40.7128° N&nbsp; 74.0060° W<br/>MARKET / NVDA</span><span>PRICE FEED<br/>AGE VISIBLE</span></div></div></section>
    <section className="dl-interlude" aria-label="From one market to the whole picture"><div className="dl-interlude__orbit">{Array.from({length:18},(_,i)=><span key={i} style={{'--a':`${i*20}deg`,background:palette[i%3] } as React.CSSProperties}/>)}</div><div className="dl-interlude__core"><div className="dl-interlude__bars">{Array.from({length:31},(_,i)=><i key={i} style={{height:`${9 + (i*13)%25}px`}}/>)}</div><span>ONE MARKET&nbsp; · &nbsp;ONE CLEAR RISK</span></div></section>
    <section className="dl-process" id="how-it-works"><div className="dl-process__ruler" aria-hidden="true">{Array.from({length:80},(_,i)=><span key={i}>····</span>)}</div><div className="dl-process__steps">{steps.map((step,i)=><article key={step.n} className={`dl-step ${activeStep===i?'is-active':''}`} data-step={i}><span className="dl-step__number">{step.n}</span><div className="dl-step__content"><span className="dl-step__icon">{step.icon}</span><h2>{step.title}</h2><p>{step.body}</p>{i===2&&<Pill href={APP}>GO TO MARKETS</Pill>}</div></article>)}</div><div className="dl-process__visual"><MarketVisual active={activeStep}/></div></section>
    <section className="dl-markets" id="markets"><h2>Markets in view.<br/>Every price has an age.</h2><div className="dl-token-window"><div className="dl-token-track">{[...symbols,...symbols].map((symbol,i)=><a href={APP} className="dl-token" key={`${symbol}-${i}`}><img src={tokenLogo(symbol)} alt=""/><span>{symbol}</span><span className="dl-token__corners"/></a>)}</div></div><div className="dl-markets__ruler"/><Pill href={APP}>VIEW MARKETS&nbsp; ↗</Pill></section>
    <section className="dl-explainer" id="price-age"><p className="dl-explainer__statement">A market is more than a rate. Prisma puts the collateral, loan limit and age of its underlying price in front of you.</p><div className="dl-explainer__list" id="faq">{details.map((item,i)=><div className={`dl-disclosure ${openDetail===i?'is-open':''}`} key={item.title}><button aria-expanded={openDetail===i} onClick={()=>setOpenDetail(openDetail===i?null:i)}>{item.title}<span>{openDetail===i?'−':'+'}</span></button><div className="dl-disclosure__body"><p>{item.body}</p></div></div>)}</div></section>
    <section className="dl-contact"><div className="dl-contact__dots" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${5+(i*31)%92}%`,top:`${16+(i*43)%68}%`,background:palette[i%3]}}/>)}</div><h2>Explore the<br/>markets with us</h2><Pill href={APP}>LAUNCH APP</Pill></section>
    <footer className="dl-footer"><a className="dl-footer__brand" href="#top">Prisma</a><div><span>EXPLORE:</span><a href={APP}>MARKETS</a><a href="#how-it-works">HOW IT WORKS</a><a href="#price-age">PRICE AGE</a><a href="#faq">FAQ</a></div><div><span>PRISMA:</span><a href="#/docs">DOCS</a><a href="#/vaults">VAULTS</a><a href="#/stake">STAKE</a><a href="https://x.com/" target="_blank" rel="noreferrer">X / TWITTER</a></div><small>PRISMA&nbsp; © 2026&nbsp; <ArrowUpRight size={12}/></small></footer>
  </div>;
}
