import { useEffect, useState } from 'react';

type LiveMarket = {
  collateralSymbol: string; borrowSymbol: string;
  supplyApy: number; borrowApy: number;
  maxLtv: number; liquidationLtv: number; updatedAt: string;
};

export default function LiveMarketInfo({ asset }: { asset: string }) {
  const [market, setMarket] = useState<LiveMarket | null>(null);
  useEffect(() => {
    let active = true;
    setMarket(null);
    fetch('/api/live-market?asset=' + encodeURIComponent(asset), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setMarket(data?.available ? data.market : null); })
      .catch(() => { if (active) setMarket(null); });
    return () => { active = false; };
  }, [asset]);
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
    <p className="product-disclaimer">The catalogue row and quote above are illustrative USDG previews. This USDC reserve is separate. Transactions are not enabled in Prisma.</p>
  </div>;
}
