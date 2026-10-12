import { send } from './_shared';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' });
  return send(res, 200, {
    ok: true,
    service: 'prisma-api',
    version: 1,
    contractsConfigured: false,
    timestamp: new Date().toISOString(),
  });
}
