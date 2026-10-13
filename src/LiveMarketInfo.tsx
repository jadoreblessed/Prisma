import { useEffect, useState } from 'react';

type LiveMarket = {
  collateralSymbol: string; borrowSymbol: string;
  supplyApy: number; borrowApy: number;
  maxLtv: number; liquidationLtv: number; updatedAt: string;
};

type LivePosition = { obligationCount: number };

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
        setPosition(data?.available && Number.isInteger(data.obligationCount)
          ? { obligationCount: data.obligationCount }
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
      <span className="product-kicker">YOUR KAMINO POSITION</span>
      <strong>{positionLoading ? 'Checking wallet…' : position
        ? position.obligationCount > 0 ? `${position.obligationCount} obligation ${position.obligationCount === 1 ? 'record' : 'records'}` : 'No obligation record in this market'
        : 'Position data unavailable'}</strong>
      <small>Read-only data for {wallet.slice(0, 5)}…{wallet.slice(-4)}. No wallet action is requested.</small>
    </div>}
    <p className="product-disclaimer">The catalogue row and quote above are illustrative USDG previews. This USDC reserve is separate. Transactions are not enabled in Prisma.</p>
  </div>;
}
