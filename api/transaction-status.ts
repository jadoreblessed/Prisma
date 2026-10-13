import { Connection } from '@solana/web3.js';

const RPC = process.env.PRISMA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
const GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function send(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  const signature = String(req.query?.signature || '');
  if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature)) return send(res, 400, { error: 'invalid_signature' });
  try {
    const connection = new Connection(RPC, 'confirmed');
    if (await connection.getGenesisHash() !== GENESIS) return send(res, 503, { error: 'non_mainnet_rpc' });
    const result = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    const entry = result.value[0];
    if (!entry) return send(res, 200, { status: 'pending' });
    if (entry.err) return send(res, 200, { status: 'failed', error: entry.err });
    return send(res, 200, { status: entry.confirmationStatus === 'finalized' ? 'finalized' : 'confirmed' });
  } catch {
    return send(res, 503, { error: 'status_unavailable' });
  }
}
