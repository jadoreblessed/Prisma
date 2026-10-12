import { markets, send } from './_shared';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const equity = markets.filter(m => m.category === 'equity');
  const other = markets.filter(m => m.category === 'other');
  const programId = process.env.PRISMA_PROGRAM_ID || null;
  const marketAddress = process.env.PRISMA_MARKET_ADDRESS || null;
  const contractsConfigured = Boolean(programId && marketAddress);
  return send(res, 200, {
    status: contractsConfigured ? 'mainnet-paused' : 'mainnet-ready',
    network: 'solana-mainnet-beta',
    programId,
    marketAddress,
    marketPaused: true,
    collateralMint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
    borrowMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    contractsConfigured,
    marketCount: markets.length,
    equityAssets: equity.length,
    otherAssets: other.length,
    capabilities: { marketData: true, riskQuotes: true, phantomWallet: true, onchainProgram: contractsConfigured, transactions: false },
  });
}
