// Tickers in Prisma's equity catalogue. A ticker becomes actionable only after
// the Kamino collateral listing and reserve metrics independently match it.
export const EQUITY_CATALOGUE = [
  'AAPL', 'AMD', 'AMZN', 'ASML', 'BABA', 'CLSK', 'COIN', 'CRCL', 'CRWV',
  'DELL', 'EWY', 'GME', 'GOOGL', 'INTC', 'IONQ', 'META', 'MSFT', 'MSTR',
  'MU', 'NBIS', 'NVDA', 'ORCL', 'PLTR', 'QQQ', 'RGTI', 'RKLB', 'SGOV',
  'SLV', 'SNDK', 'SPCX', 'SPY', 'TSLA', 'TSM', 'USAR', 'USO',
  'HOOD', 'cbBTC',
] as const;
export const CATALOGUE_ASSETS = new Set<string>(EQUITY_CATALOGUE);
