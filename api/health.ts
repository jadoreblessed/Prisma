import { send } from './_shared';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  return send(res, 200, {
    ok: true,
    service: 'prisma-api',
    version: 1,
    network: 'solana-mainnet-beta',
    contractsConfigured: Boolean(process.env.PRISMA_PROGRAM_ID && process.env.PRISMA_MARKET_ADDRESS),
    timestamp: new Date().toISOString(),
  });
}
