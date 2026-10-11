import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Clock3, Menu, X } from 'lucide-react';
import Product from './Product';

const MARKETS = '#/markets';
const DOCS = '#/docs';
const HeroShader = lazy(() => import('./HeroShader'));

function Mark() {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 2.5c1.5 12.6 8.9 20 21.5 21.5C32.9 25.5 25.5 32.9 24 45.5 22.5 32.9 15.1 25.5 2.5 24 15.1 22.5 22.5 15.1 24 2.5Z" fill="currentColor"/></svg>;
}
function RollButton({children,href,tone='orange',className=''}:{children:string;href:string;tone?:'orange'|'dark';className?:string}) {
  return <a href={href} className={`roll-button roll-button--${tone} group ${className}`}><span className="roll-button__window"><span>{children}</span><span aria-hidden="true">{children}</span></span><span className="roll-button__icon"><ArrowRight size={16} strokeWidth={1.8}/></span></a>;
}
function Badge({number,children}:{number:string;children:ReactNode}) {
  return <div className="section-badge"><span className="section-badge__number">{number}</span><span className="section-badge__label">{children}</span></div>;
}
function useNewYorkTime() {
  const getTime=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const [time,setTime]=useState(getTime);
  useEffect(()=>{const id=window.setInterval(()=>setTime(getTime()),1000);return()=>window.clearInterval(id)},[]);
  return time;
}
function Landing() {
  const [menuOpen,setMenuOpen]=useState(false);
  const [canUseShader]=useState(()=>typeof navigator!=='undefined' && 'gpu' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const time=useNewYorkTime();
  useEffect(()=>{document.body.style.overflow=menuOpen?'hidden':'';return()=>{document.body.style.overflow=''}},[menuOpen]);
  useEffect(()=>{
    const items=document.querySelectorAll<HTMLElement>('.reveal');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});
    items.forEach(item=>observer.observe(item));return()=>observer.disconnect();
  },[]);
  const nav=[['Markets',MARKETS],['How it works','#about'],['Price age','#price-age'],['Docs',DOCS]];
  return <div className="landing-v2">
    <section className="landing-hero" id="top">
      <div className="hero-shader" aria-hidden="true">{canUseShader&&<Suspense fallback={null}><HeroShader/></Suspense>}</div>
      <div className="hero-foreground">
        <header className="landing-header"><nav className="landing-nav" aria-label="Main navigation">
          <div className="landing-nav__left"><a className="landing-logo" href="#top" aria-label="Prisma home"><Mark/></a><div className="landing-nav__links">{nav.map(([label,href])=><a href={href} key={label}>{label}</a>)}</div></div>
          <div className="landing-nav__right"><span className="landing-nav__descriptor">Tokenized equity lending</span><span className="landing-nav__clock"><Clock3 size={14}/>{time} in New York</span><RollButton href={MARKETS} tone="dark">Launch app</RollButton></div>
          <button className="landing-menu-toggle" type="button" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
        </nav></header>
        <div className="hero-content">
          <p className="hero-label">PRISMA / ISOLATED LENDING</p>
          <h1>Every market, <br className="desktop-break"/>a clearer view <br className="desktop-break"/>of the risk.</h1>
          <p className="hero-description">Borrow against tokenized equities. See the asset, loan limit and age of its price before you act.</p>
          <div className="hero-actions"><RollButton href={MARKETS}>Explore markets</RollButton><a className="hero-badge" href="#price-age"><span className="hero-badge__mark"><Mark/></span><span>Price age in view</span><span className="hero-badge__tag">PRISMA</span></a></div>
        </div><span className="hero-corner">01 / 03&nbsp; &nbsp; SCROLL TO EXPLORE</span>
      </div>
    </section>
    <section className="landing-about" id="about"><div className="landing-container">
      <div className="landing-pad reveal"><Badge number="1">Introducing Prisma</Badge><h2 className="section-title">One asset. One market.<br/>One clear risk.</h2></div>
      <div className="about-layout landing-pad">
        <div className="about-small reveal"><img src="/assets/about.webp" alt="Refracted glass with a warm center" loading="lazy"/></div>
        <div className="about-copy reveal"><p>Each tokenized asset has its own borrow asset, oracle and liquidation limit. Supply stablecoins to earn, or post shares as collateral to borrow.</p><RollButton href={DOCS}>How Prisma works</RollButton></div>
        <div className="about-large reveal"><img src="/assets/markets.webp" alt="Prismatic glass and light" loading="lazy"/><div className="about-large__caption"><span>ISOLATED BY DESIGN</span><span>MARKET / 001</span></div></div>
      </div>
    </div></section>
    <section className="landing-features" id="price-age"><div className="landing-container landing-pad">
      <div className="reveal"><Badge number="2">Inside the interface</Badge><h2 className="section-title features-title">The full position.<br/>In one view.</h2></div>
      <div className="feature-grid">
        <a className="feature-card feature-card--markets reveal" href={MARKETS}><div className="feature-card__visual">
          <div className="feature-orbit" aria-hidden="true"><Mark/></div>
          <div className="market-preview" aria-hidden="true"><div className="market-preview__head"><span>MARKET</span><span>LOAN LIMIT</span><span>PRICE AGE</span></div>
            <div className="market-preview__row"><strong>SPY <small>/ USDG</small></strong><span>62.5%</span><em>4h 17m</em></div>
            <div className="market-preview__row"><strong>NVDA <small>/ USDG</small></strong><span>62.5%</span><em>11h 59m</em></div>
            <div className="market-preview__row"><strong>TSLA <small>/ USDG</small></strong><span>62.5%</span><em>6h 17m</em></div>
          </div><span className="feature-card__hover"><span>View markets</span><ArrowRight size={16}/></span>
        </div><p>Explore assets, loan limits, rates and price age together in a single market view.</p><h3>Isolated markets</h3></a>
        <a className="feature-card feature-card--age reveal" href={DOCS}><div className="feature-card__visual">
          <div className="age-object" aria-hidden="true"><span className="age-object__inner"><Mark/></span></div>
          <div className="age-readout" aria-hidden="true"><span>ORACLE PRICE AGE</span><strong>04:17<span>h</span></strong><small>VISIBLE BEFORE YOU ACT</small></div>
          <span className="feature-card__hover"><span>How it works</span><ArrowRight size={16}/></span>
        </div><p>The underlying exchange can pause. Prisma keeps the age of the price in view.</p><h3>See the price. See its age.</h3></a>
      </div><div className="features-footer"><span>PRISMA / TOKENIZED EQUITY LENDING</span><a href="#top">BACK TO TOP ↑</a></div>
    </div></section>
    <div className={`landing-menu ${menuOpen?'is-open':''}`} aria-hidden={!menuOpen}><div className="landing-menu__backdrop" onClick={()=>setMenuOpen(false)}/><div className="landing-menu__sheet">
      <div className="landing-menu__top"><span><Clock3 size={14}/>{time} in New York</span><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
      <div className="landing-menu__links">{nav.map(([label,href],index)=><a href={href} key={label} onClick={()=>setMenuOpen(false)} style={{transitionDelay:menuOpen?`${index*55}ms`:'0ms'}}>{label}<ArrowRight size={24}/></a>)}</div>
      <RollButton href={MARKETS} tone="dark" className="landing-menu__cta">Launch app</RollButton>
    </div></div>
  </div>;
}
export default function App(){
  const [route,setRoute]=useState(()=>location.hash.startsWith('#/')?location.hash.slice(2):'');
  useEffect(()=>{const change=()=>{const next=location.hash.startsWith('#/')?location.hash.slice(2):'';if(next||document.querySelector('.product-page'))window.scrollTo(0,0);setRoute(next)};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
  return route==='markets'||route==='docs'?<Product route={route}/>:<Landing/>;
}
