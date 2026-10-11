import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import Product from './Product';

const APP = '#/markets';
const MARKETS = '#/markets';
const DOCS = '#/docs';
const tokens = [
  ['SPY','S&P 500 ETF','#1647dc','4h 17m'], ['NVDA','NVIDIA','#83ba18','11h 59m'],
  ['TSLA','Tesla','#db2636','6h 17m'], ['CRWV','CoreWeave','#414478','48m'],
  ['NBIS','Nebius','#b9d600','25m'], ['AAPL','Apple','#20232a','5h 22m']
];
const clamp = (x:number) => Math.max(0,Math.min(1,x));
const phase = (p:number,a:number,b:number) => clamp((p-a)/(b-a));
const styleFor = (opacity:number):CSSProperties => ({opacity,visibility:opacity<.01?'hidden':'visible',pointerEvents:opacity>.7?'auto':'none'});
function Mark(){return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 2.5c1.5 12.6 8.9 20 21.5 21.5C32.9 25.5 25.5 32.9 24 45.5 22.5 32.9 15.1 25.5 2.5 24 15.1 22.5 22.5 15.1 24 2.5Z" fill="currentColor"/></svg>}
function GlassButton({children,href,onClick,small=false}:{children:ReactNode;href?:string;onClick?:()=>void;small?:boolean}){
  const ref=useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const move=(e:PointerEvent<HTMLElement>)=>{const el=ref.current;if(!el)return;const b=el.getBoundingClientRect();el.style.setProperty('--light-x',`${((e.clientX-b.left)/b.width)*100}%`);el.style.setProperty('--light-y',`${((e.clientY-b.top)/b.height)*100}%`)};
  const leave=()=>{ref.current?.style.setProperty('--light-x','50%');ref.current?.style.setProperty('--light-y','12%')};
  const props={ref,className:`glass-button ${small?'glass-button--small':''}`,onPointerMove:move,onPointerLeave:leave};
  return href?<a {...props} href={href}>{children}</a>:<button {...props} type="button" onClick={onClick}>{children}</button>;
}
function useScene(){
  const track=useRef<HTMLDivElement>(null);const [progress,setProgress]=useState(0);
  useEffect(()=>{let raf=0;const update=()=>{raf=0;const el=track.current;if(!el)return;const p=clamp((window.scrollY-el.offsetTop)/Math.max(1,el.offsetHeight-window.innerHeight));setProgress(old=>Math.abs(old-p)>.0002?p:old)};const schedule=()=>{if(!raf)raf=requestAnimationFrame(update)};update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('orientationchange',schedule)}},[]);
  const go=(p:number)=>{const el=track.current;if(el)window.scrollTo({top:el.offsetTop+p*(el.offsetHeight-window.innerHeight),behavior:'smooth'})};
  return {track,progress,go};
}
function Landing(){
  const {track,progress,go}=useScene();const [menu,setMenu]=useState(false);const [ready,setReady]=useState(false);
  const [videoReady,setVideoReady]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  useEffect(()=>{const id=requestAnimationFrame(()=>setReady(true));return()=>cancelAnimationFrame(id)},[]);
  useEffect(()=>{document.body.style.overflow=menu?'hidden':'';return()=>{document.body.style.overflow=''}},[menu]);
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    let frame=0,last=performance.now(),current=0,target=0,stopped=false;
    const tick=(now:number)=>{
      if(stopped)return;
      const el=track.current;
      const span=Math.max(1,(el?.offsetHeight||window.innerHeight)-window.innerHeight);
      target=clamp((window.scrollY-(el?.offsetTop||0))/span)*(Number.isFinite(video.duration)?video.duration:0);
      const dt=Math.min(.1,(now-last)/1000);last=now;
      current+=(target-current)*(1-Math.exp(-11*dt));
      if(Math.abs(target-current)<.006)current=target;
      if(video.readyState>=1&&!video.seeking&&Math.abs(video.currentTime-current)>.018){try{video.currentTime=Math.min(current,Math.max(0,video.duration-.025))}catch{/* wait for metadata */}}
      frame=requestAnimationFrame(tick);
    };
    const unlock=()=>{video.play().then(()=>{video.pause();video.currentTime=current}).catch(()=>{})};
    video.addEventListener('loadedmetadata',()=>{video.pause();video.currentTime=0});
    window.addEventListener('pointerdown',unlock,{once:true});
    window.addEventListener('touchstart',unlock,{once:true});
    frame=requestAnimationFrame(tick);
    return()=>{stopped=true;cancelAnimationFrame(frame);window.removeEventListener('pointerdown',unlock);window.removeEventListener('touchstart',unlock);video.pause()};
  },[track]);
  const jump=(p:number)=>{setMenu(false);go(p)};
  const hero=1-phase(progress,.19,.29),about=phase(progress,.30,.38)*(1-phase(progress,.57,.65)),markets=phase(progress,.66,.74);
  return <div className="site" ref={track}><div className="scene">
    <div className="art art--hero" style={{opacity:videoReady?0:1-phase(progress,.25,.39),transform:`scale(${1+progress*.42}) translate3d(${progress*-5}%,${progress*-4}%,0)`}} aria-hidden="true"/>
    <div className="art art--about" style={{opacity:videoReady?0:phase(progress,.27,.40)*(1-phase(progress,.61,.75)),transform:`scale(${1.07-phase(progress,.27,.65)*.08}) translate3d(${phase(progress,.27,.65)*-2}%,0,0)`}} aria-hidden="true"/>
    <div className="art art--markets" style={{opacity:videoReady?0:phase(progress,.63,.77),transform:`scale(${1.07-phase(progress,.64,1)*.07})`}} aria-hidden="true"/>
    <div className={`footage ${progress<.30?'footage--hero':progress<.66?'footage--about':'footage--markets'}`} style={{opacity:videoReady?1:0}} aria-hidden="true"><video ref={videoRef} onLoadedData={()=>setVideoReady(true)} muted playsInline preload="auto"><source src="/assets/ascend-scrub-mobile.mp4" media="(max-width: 700px)" type="video/mp4"/><source src="/assets/ascend-scrub.mp4" type="video/mp4"/></video></div>
    <header className={`header ${ready?'is-ready':''}`}><a className="brand" href="#top" onClick={e=>{e.preventDefault();jump(0)}} aria-label="Prisma — home"><span className="brand-mark"><Mark/></span><span>Prisma<span className="brand-period">.</span></span></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#about" onClick={e=>{e.preventDefault();jump(.43)}}>About</a><a href="#markets" onClick={e=>{e.preventDefault();jump(.83)}}>Markets</a><a href={DOCS}>Docs</a></nav>
      <div className="header-actions"><GlassButton href={APP} small>Launch app</GlassButton><a className="arrow-square" href={APP} aria-label="Launch Prisma app"><ArrowUpRight size={17} strokeWidth={1.6}/></a></div><button className="menu-toggle" type="button" onClick={()=>setMenu(true)} aria-label="Open menu"><Menu size={24} strokeWidth={1.5}/></button>
    </header>
    <main>
      <section id="top" className={`panel hero ${ready?'is-ready':''}`} style={styleFor(hero)} aria-hidden={hero<.01}><div className="hero-main"><p className="eyebrow hero-eyebrow">TOKENIZED EQUITY LENDING</p><h1>Capital for the <em>next</em><br/><em>generation</em> of markets.</h1><div className="hero-cta"><GlassButton href={MARKETS}>Explore markets <ArrowUpRight size={16}/></GlassButton><button className="text-link" type="button" onClick={()=>jump(.43)}>How it works <ArrowRight size={16}/></button></div></div><div className="hero-bottom"><button type="button" onClick={()=>jump(.43)} className="scroll-prompt"><ArrowDown size={15}/> Scroll to discover</button><p>Isolated markets for tokenized shares.<br/>See the asset, loan limit and age of its price.</p></div></section>
      <section id="about" className="panel about" style={styleFor(about)} aria-hidden={about<.01}><div className="section-content"><p className="kicker"><span>01 / THE PROTOCOL</span><i/></p><h2>Bring your shares<br/>to a market built<br/>for <em>clarity.</em></h2><p className="about-copy">Each market pairs a tokenized asset with its own borrow asset, oracle and liquidation limit. Supply to earn, or post collateral to borrow.</p><GlassButton href={DOCS}>How Prisma works <ArrowUpRight size={16}/></GlassButton></div><div className="section-index">01 — 03</div></section>
      <section id="markets" className="panel markets" style={styleFor(markets)} aria-hidden={markets<.01}><div className="market-intro"><p className="kicker"><span>02 / MARKETS</span><i/></p><h2><em>Every market.</em><br/>One clear view.</h2><p>Explore tokenized equities, isolated borrowing and price age together. Know what sits behind a position before you act.</p><GlassButton href={MARKETS}>View markets <ArrowUpRight size={16}/></GlassButton></div><div className="market-board" aria-label="Example markets"><div className="board-heading"><span>MARKET PREVIEW</span><span>PRICE AGE <ArrowUpRight size={14}/></span></div><div className="market-grid">{tokens.map(([symbol,name,color,age])=><a className="market-card" href={MARKETS} key={symbol}><span className="token-icon" style={{backgroundColor:color}}>{symbol[0]}</span><span className="token-name"><strong>{symbol}</strong><small>{name}</small></span><span className="token-age">{age}</span><ArrowUpRight className="card-arrow" size={16} strokeWidth={1.4}/></a>)}</div><div className="board-foot">Illustrative preview · open app for current data</div></div><div className="section-index">02 — 03</div></section>
    </main><div className="progress-rail" aria-hidden="true"><span style={{height:`${Math.max(6,progress*100)}%`}}/></div>
    <div className={`mobile-menu ${menu?'open':''}`} aria-hidden={!menu}><button className="menu-close" type="button" onClick={()=>setMenu(false)} aria-label="Close menu"><X size={24}/></button><div className="menu-links"><button onClick={()=>jump(0)}>Home</button><button onClick={()=>jump(.43)}>About</button><button onClick={()=>jump(.83)}>Markets</button><a href={DOCS}>Docs</a><a href={APP}>Launch app <ArrowUpRight size={24}/></a></div><span className="menu-caption">PRISMA / TOKENIZED EQUITY LENDING</span></div>
  </div></div>;
}
export default function App(){
 const [route,setRoute]=useState(()=>location.hash.slice(2));
 useEffect(()=>{const change=()=>{setRoute(location.hash.startsWith('#/')?location.hash.slice(2):'');window.scrollTo(0,0)};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
 return route==='markets'||route==='docs'?<Product route={route}/>:<Landing/>;
}
