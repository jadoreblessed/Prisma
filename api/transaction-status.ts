const RPC = process.env.PRISMA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
const GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error('rpc_unavailable');
  const payload = await response.json();
  if (payload.error) throw new Error('rpc_unavailable');
  return payload.result as T;
}

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
    if (await rpc<string>('getGenesisHash') !== GENESIS) return send(res, 503, { error: 'non_mainnet_rpc' });
    const result = await rpc<{ value: Array<{ err: unknown; confirmationStatus: string } | null> }>(
      'getSignatureStatuses', [[signature], { searchTransactionHistory: true }]);
    const entry = result.value[0];
    if (!entry) return send(res, 200, { status: 'pending' });
    if (entry.err) return send(res, 200, { status: 'failed', error: entry.err });
    return send(res, 200, { status: entry.confirmationStatus === 'finalized' ? 'finalized' : 'confirmed' });
  } catch {
    return send(res, 503, { error: 'status_unavailable' });
  }
}
