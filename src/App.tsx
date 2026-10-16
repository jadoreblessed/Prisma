import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import Product from './Product';
import PrismaMark from './PrismaMark';
import GlassButton from './GlassButton';
import LandingSections from './LandingSections';
import AssetRibbon from './AssetRibbon';
import SiteAdmin from './SiteAdmin';

const MARKETS = '#/markets';
const DOCS = '#/docs';
const HeroShader = lazy(() => import('./HeroShader'));

function Landing() {
  const [menuOpen,setMenuOpen]=useState(false);
  const [branding,setBranding]=useState<{xUrl:string;ca:string}>({xUrl:'',ca:''});
  const [copied,setCopied]=useState(false);
  useEffect(()=>{let active=true;fetch('/api/site-config',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(active)setBranding({xUrl:data.xUrl||'',ca:data.ca||''})}).catch(()=>{});return()=>{active=false}},[]);
  const copyCa=async()=>{try{await navigator.clipboard.writeText(branding.ca);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}};
  const [canUseShader]=useState(()=>typeof navigator!=='undefined' && 'gpu' in navigator && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{document.body.style.overflow=menuOpen?'hidden':'';return()=>{document.body.style.overflow=''}},[menuOpen]);
  useEffect(()=>{
    const items=document.querySelectorAll<HTMLElement>('.reveal:not(.ch-stats), .ch-feature-row');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -8% 0px'});
    items.forEach(item=>observer.observe(item));
    const statsObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');statsObserver.unobserve(entry.target)}}),{threshold:.05,rootMargin:'0px 0px 0px 0px'});
    document.querySelectorAll<HTMLElement>('.ch-stats').forEach(item=>statsObserver.observe(item));
    return()=>{observer.disconnect();statsObserver.disconnect()};
  },[]);
  const nav=[['Markets',MARKETS],['How it works','#how'],['Price age','#price-age'],['Docs',DOCS]];
  return <div className="landing-v2">
    <section className="landing-hero" id="top">
      <div className="hero-shader" aria-hidden="true"><div className="hero-fallback"/>{canUseShader&&<Suspense fallback={null}><HeroShader/></Suspense>}</div>
      <div className="hero-foreground">
        <header className="landing-header"><nav className="landing-nav" aria-label="Main navigation">
          <div className="landing-nav__left"><a className="landing-logo" href="#top" aria-label="Prisma home"><PrismaMark/></a><div className="landing-nav__links">{nav.map(([label,href])=><a href={href} key={label}>{label}</a>)}</div></div>
          <div className="landing-nav__right">{branding.xUrl&&<a className="social-x" href={branding.xUrl} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">𝕏</a>}<GlassButton href={MARKETS} arrow>Launch app</GlassButton></div>
          <button className="landing-menu-toggle" type="button" onClick={()=>setMenuOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
        </nav></header>
        <div className="hero-content">
          <h1><span className="hero-title-line"><span>Every market,</span></span><span className="hero-title-line"><span>a clearer view</span></span><span className="hero-title-line"><span>of the risk.</span></span></h1>
          <p className="hero-description">Borrow against tokenized equities. See the asset, loan limit and age of its price before you act.</p>
          <div className="hero-actions"><GlassButton href={MARKETS} arrow>Explore markets</GlassButton>{branding.ca?<button className="hero-badge" type="button" onClick={copyCa} title={branding.ca}>{copied?'CA copied':`CA ${branding.ca.slice(0,4)}…${branding.ca.slice(-4)} · copy`}</button>:<span className="hero-badge">CA coming soon</span>}</div>
        </div><span className="hero-corner">01 / 02&nbsp; &nbsp; SCROLL TO EXPLORE</span>
      </div>
      <AssetRibbon/>
    </section>
    <LandingSections xUrl={branding.xUrl}/>
    <div className={`landing-menu ${menuOpen?'is-open':''}`} aria-hidden={!menuOpen}><div className="landing-menu__backdrop" onClick={()=>setMenuOpen(false)}/><div className="landing-menu__sheet">
      <div className="landing-menu__top"><span>PRISMA</span><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
      <div className="landing-menu__links">{nav.map(([label,href],index)=><a href={href} key={label} onClick={()=>setMenuOpen(false)} style={{transitionDelay:menuOpen?`${index*55}ms`:'0ms'}}>{label}<ArrowRight size={24}/></a>)}{branding.xUrl&&<a href={branding.xUrl} target="_blank" rel="noopener noreferrer">X / Twitter <ArrowRight size={24}/></a>}</div>
      <GlassButton href={MARKETS} className="landing-menu__cta" arrow>Launch app</GlassButton>
    </div></div>
  </div>;
}
export default function App(){
  const [route,setRoute]=useState(()=>location.hash.startsWith('#/')?location.hash.slice(2):'');
  useEffect(()=>{const change=()=>{const next=location.hash.startsWith('#/')?location.hash.slice(2):'';if(next||document.querySelector('.product-page'))window.scrollTo(0,0);setRoute(next)};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
  return route==='admin'?<SiteAdmin/>:['markets','vaults','claim','docs','faq'].includes(route)?<Product route={route}/>:<Landing/>;
}
