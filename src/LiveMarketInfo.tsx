import { useEffect, useState } from 'react';
import KaminoTrade from './KaminoTrade';

type LiveMarket = {
  market: string; collateralMint: string; collateralReserve: string; borrowMint: string; borrowReserve: string;
  collateralSymbol: string; borrowSymbol: 'USDC' | 'USDG';
  supplyApy: number; borrowApy: number;
  maxLtv: number; liquidationLtv: number; updatedAt: string;
};

type PositionAsset = { mint: string; symbol: string; amount: string; value: number | null };
type LivePosition = {
  supplies: PositionAsset[];
  positions: Array<{
    netValue: number | null; totalDepositValue: number | null; totalBorrowValue: number | null;
    ltv: number | null; maxLtv: number | null; liquidationLtv: number | null;
    deposits: PositionAsset[]; borrows: PositionAsset[];
  }>;
};

const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value);

const tokenAmount = (raw: string) => {
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return raw;
  if (amount > 0 && amount < 0.000001) return '<0.000001';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: amount >= 0.01 ? 2 : 0,
    maximumFractionDigits: amount >= 0.01 ? 2 : 6,
  }).format(amount);
};

function PositionAssets({ title, items }: { title: string; items: PositionAsset[] }) {
  if (!items.length) return null;
  return <div className="product-live-position__assets">
    <span>{title}</span>
    {items.map(item => <div key={item.mint}>
      <b title={`${item.amount} ${item.symbol}`}>{tokenAmount(item.amount)} {item.symbol}</b><small>{money(item.value)}</small>
    </div>)}
  </div>;
}

export default function LiveMarketInfo({ asset, wallet, onConnect, borrowAssets }: { asset: string; wallet?: string; onConnect: () => Promise<void>; borrowAssets?: Array<'USDC' | 'USDG'> }) {
  const [borrowAsset, setBorrowAsset] = useState<'USDC' | 'USDG'>(borrowAssets?.includes('USDG') ? 'USDG' : 'USDC');
  const [market, setMarket] = useState<LiveMarket | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setMarket(null);
    setMarketLoading(true);
    fetch('/api/live-market?' + new URLSearchParams({ asset, borrowAsset }), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setMarket(data?.available ? data.market : null); })
      .catch(() => { if (active) setMarket(null); })
      .finally(() => { if (active) setMarketLoading(false); });
    return () => { active = false; };
  }, [asset, borrowAsset]);
  useEffect(() => {
    let active = true;
    setPosition(null);
    if (!wallet) { setPositionLoading(false); return () => { active = false; }; }
    setPositionLoading(true);
    const params = new URLSearchParams({ asset, borrowAsset, wallet });
    fetch('/api/live-position?' + params.toString(), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active) return;
        setPosition(data?.available && Array.isArray(data.positions)
          ? { positions: data.positions, supplies: Array.isArray(data.supplies) ? data.supplies : [] }
          : null);
      })
      .catch(() => { if (active) setPosition(null); })
      .finally(() => { if (active) setPositionLoading(false); });
    return () => { active = false; };
  }, [asset, borrowAsset, wallet, refresh]);
  const selector = <div className="market-tabs" role="group" aria-label="Borrow asset">{(borrowAssets || ['USDG', 'USDC']).map(symbol =>
    <button type="button" key={symbol} className={borrowAsset === symbol ? 'active' : ''} onClick={() => setBorrowAsset(symbol)}>{symbol}</button>)}</div>;
  if (!market || market.borrowSymbol !== borrowAsset) return <div className="product-live-info" role="status">
    {selector}
    <span className="product-kicker">VERIFIED MARKET · SOLANA</span>
    <p>{marketLoading ? `Checking this ${borrowAsset} reserve…` : 'Verified reserve data is unavailable right now.'}</p>
    <p className="product-disclaimer">If the reserve cannot be verified, Prisma will not display lending terms for it.</p>
  </div>;
  return <div className="product-live-info">
    {selector}
    <span className="product-kicker">LIVE RESERVE DATA · SOLANA</span>
    <h3>{market.collateralSymbol} / {market.borrowSymbol}</h3>
    <div className="product-live-info__stats">
      <div><span>Supply APY</span><strong>{market.supplyApy.toFixed(2)}%</strong></div>
      <div><span>Borrow APY</span><strong>{market.borrowApy.toFixed(2)}%</strong></div>
      <div><span>Max LTV</span><strong>{(market.maxLtv * 100).toFixed(1)}%</strong></div>
      <div><span>Liquidation LTV</span><strong>{(market.liquidationLtv * 100).toFixed(1)}%</strong></div>
    </div>
    <KaminoTrade key={`${asset}-${borrowAsset}`} asset={asset} market={market} wallet={wallet} onConnect={onConnect} onComplete={() => setRefresh(value => value + 1)}/>
    {wallet && <div className="product-live-position" aria-live="polite">
      <span className="product-kicker">YOUR {market.collateralSymbol} COLLATERAL POSITION · LIVE FROM KAMINO</span>
      {positionLoading ? <strong>Checking wallet…</strong> : position
        ? <>
          <PositionAssets title={`YOUR ${borrowAsset} SUPPLY IN THIS MARKET`} items={position.supplies}/>
          {position.positions.length ? position.positions.map((item, index) => <div className="product-live-position__entry" key={index}>
          <div className="product-live-position__stats">
            <div><span>Pool deposited</span><strong>{money(item.totalDepositValue)}</strong></div>
            <div><span>Pool borrowed</span><strong>{money(item.totalBorrowValue)}</strong></div>
            <div><span>Pool net value</span><strong>{money(item.netValue)}</strong></div>
            <div><span>Pool LTV</span><strong>{item.ltv === null ? '—' : `${(item.ltv * 100).toFixed(1)}%`}</strong></div>
          </div>
          <PositionAssets title="COLLATERAL" items={item.deposits}/>
          <PositionAssets title="BORROWED" items={item.borrows}/>
        </div>) : !position.supplies.length && <strong>No open position in this market</strong>}
          </>
        : <strong>Position data unavailable</strong>}
      <small>Pool totals and LTV include other assets in this Kamino obligation. Below, collateral shows only {market.collateralSymbol} and debt only {borrowAsset}. Wallet {wallet.slice(0, 5)}…{wallet.slice(-4)}.</small>
    </div>}
    <p className="product-disclaimer">Terms are from the verified Solana {borrowAsset} reserve. Price age is unavailable until the lending oracle timestamp can be verified.</p>
  </div>;
}
