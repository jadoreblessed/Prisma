import { useState } from 'react';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { tokenLogo } from './marketData';
import './AssetRibbon.css';

const assets = [
  ['NVDA', 'Nvidia'], ['AAPL', 'Apple'], ['TSLA', 'Tesla'],
  ['GOOGL', 'Alphabet'], ['META', 'Meta'], ['SPY', 'S&P 500'],
];

export default function AssetRibbon() {
  const [paused, setPaused] = useState(false);
  return <section className={`asset-ribbon${paused ? ' is-paused' : ''}`} aria-label="Explore market catalogue">
    <div className="asset-ribbon__heading">
      <span>EXPLORE THE MARKETS</span>
      <div>
        <button type="button" aria-label={paused ? 'Resume market ticker' : 'Pause market ticker'} aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? <Play size={14}/> : <Pause size={14}/>}
        </button>
        <a href="#/markets">All markets <ArrowUpRight size={16}/></a>
      </div>
    </div>
    <div className="asset-ribbon__viewport">
      <div className="asset-ribbon__track">
        {[0, 1].map(copy => <div className="asset-ribbon__group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
          {assets.map(([symbol, name]) => <a className="asset-ribbon__asset" href="#/markets" key={symbol} tabIndex={copy === 1 ? -1 : undefined}>
            <img src={tokenLogo(symbol)} alt="" width="52" height="52" decoding="async"/>
            <span><b>{symbol}x</b><small>{name}</small></span>
          </a>)}
        </div>)}
      </div>
    </div>
  </section>;
}
