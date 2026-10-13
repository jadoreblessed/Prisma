import { useEffect, useState } from 'react';

type LiveMarket = {
  collateralSymbol: string; borrowSymbol: string;
  supplyApy: number; borrowApy: number;
  maxLtv: number; liquidationLtv: number; updatedAt: string;
};

type PositionAsset = { mint: string; symbol: string; amount: string; value: number | null };
type LivePosition = {
  positions: Array<{
    netValue: number | null; totalDepositValue: number | null; totalBorrowValue: number | null;
    ltv: number | null; maxLtv: number | null; liquidationLtv: number | null;
    deposits: PositionAsset[]; borrows: PositionAsset[];
  }>;
};

const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2,
}).format(value);

function PositionAssets({ title, items }: { title: string; items: PositionAsset[] }) {
  if (!items.length) return null;
  return <div className="product-live-position__assets">
    <span>{title}</span>
    {items.map(item => <div key={item.mint}>
      <b>{item.amount} {item.symbol}</b><small>{money(item.value)}</small>
    </div>)}
  </div>;
}

export default function LiveMarketInfo({ asset, wallet }: { asset: string; wallet?: string }) {
  const [market, setMarket] = useState<LiveMarket | null>(null);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setMarket(null);
    fetch('/api/live-market?asset=' + encodeURIComponent(asset), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setMarket(data?.available ? data.market : null); })
      .catch(() => { if (active) setMarket(null); });
    return () => { active = false; };
  }, [asset]);
  useEffect(() => {
    let active = true;
    setPosition(null);
    if (!wallet) { setPositionLoading(false); return () => { active = false; }; }
    setPositionLoading(true);
    const params = new URLSearchParams({ asset, wallet });
    fetch('/api/live-position?' + params.toString(), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active) return;
        setPosition(data?.available && Array.isArray(data.positions)
          ? { positions: data.positions }
          : null);
      })
      .catch(() => { if (active) setPosition(null); })
      .finally(() => { if (active) setPositionLoading(false); });
    return () => { active = false; };
  }, [asset, wallet]);
  if (!market) return null;
  return <div className="product-live-info">
    <span className="product-kicker">LIVE RESERVE DATA · SOLANA</span>
    <h3>{market.collateralSymbol} / {market.borrowSymbol}</h3>
    <div className="product-live-info__stats">
      <div><span>Supply APY</span><strong>{market.supplyApy.toFixed(2)}%</strong></div>
      <div><span>Borrow APY</span><strong>{market.borrowApy.toFixed(2)}%</strong></div>
      <div><span>Max LTV</span><strong>{(market.maxLtv * 100).toFixed(1)}%</strong></div>
      <div><span>Liquidation LTV</span><strong>{(market.liquidationLtv * 100).toFixed(1)}%</strong></div>
    </div>
    {wallet && <div className="product-live-position" aria-live="polite">
      <span className="product-kicker">YOUR POSITION · LIVE FROM KAMINO</span>
      {positionLoading ? <strong>Checking wallet…</strong> : position
        ? position.positions.length ? position.positions.map((item, index) => <div className="product-live-position__entry" key={index}>
          <div className="product-live-position__stats">
            <div><span>Deposited</span><strong>{money(item.totalDepositValue)}</strong></div>
            <div><span>Borrowed</span><strong>{money(item.totalBorrowValue)}</strong></div>
            <div><span>Net value</span><strong>{money(item.netValue)}</strong></div>
            <div><span>Current LTV</span><strong>{item.ltv === null ? '—' : `${(item.ltv * 100).toFixed(1)}%`}</strong></div>
          </div>
          <PositionAssets title="COLLATERAL" items={item.deposits}/>
          <PositionAssets title="BORROWED" items={item.borrows}/>
        </div>) : <strong>No open position in this market</strong>
        : <strong>Position data unavailable</strong>}
      <small>Read-only for {wallet.slice(0, 5)}…{wallet.slice(-4)}. Prisma does not sign or send transactions.</small>
    </div>}
    <p className="product-disclaimer">The catalogue row and quote above are illustrative USDG previews. This USDC reserve is separate. Transactions are not enabled in Prisma.</p>
  </div>;
}
