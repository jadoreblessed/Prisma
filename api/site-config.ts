import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PublicKey } from '@solana/web3.js';

type Config = { xUrl: string; ca: string };
const REPO = 'jadoreblessed/Prisma';
const FILE = 'site-config.json';
const attempts = new Map<string, { count: number; until: number }>();

function send(res: any, status: number, body: object) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function githubHeaders(token?: string): Record<string, string> {
  return { Accept: 'application/vnd.github+json', 'User-Agent': 'Prisma-Site-Admin',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function githubFile(token?: string): Promise<{ config: Config; sha: string }> {
  const branch = process.env.PRISMA_CONFIG_BRANCH || 'fix-preflight-build-check';
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}?ref=${encodeURIComponent(branch)}`,
    { headers: githubHeaders(token), cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`github_read_${response.status}`);
  const data = await response.json() as { content: string; sha: string };
  const parsed = JSON.parse(Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8')) as Config;
  return { config: { xUrl: parsed.xUrl || '', ca: parsed.ca || '' }, sha: data.sha };
}
async function currentConfig(): Promise<Config> {
  try { return (await githubFile(process.env.PRISMA_CONFIG_GITHUB_TOKEN)).config; }
  catch {
    try { return JSON.parse(await readFile(new URL('../site-config.json', import.meta.url), 'utf8')) as Config; }
    catch { return { xUrl: 'https://x.com/', ca: '' }; }
  }
}
function validX(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' &&
    (url.hostname === 'x.com' || url.hostname === 'twitter.com') && !url.username && !url.password &&
    url.pathname.length > 1 && !url.search && !url.hash; }
  catch { return false; }
}
function validCA(value: string) {
  if (!value) return true;
  try { return new PublicKey(value).toBase58() === value; } catch { return false; }
}
function passwordMatches(value: unknown) {
  const secret = process.env.PRISMA_ADMIN_PASSWORD || '';
  if (secret.length < 16 || typeof value !== 'string' || value.length > 256) return false;
  const a = createHash('sha256').update(secret).digest();
  const b = createHash('sha256').update(value).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') return send(res, 200, await currentConfig());
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const origin = req.headers.origin;
  if (!origin || new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'invalid_origin' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'json_required' });
  const token = process.env.PRISMA_CONFIG_GITHUB_TOKEN;
  if (!token || !process.env.PRISMA_ADMIN_PASSWORD || process.env.PRISMA_ADMIN_PASSWORD.length < 16)
    return send(res, 503, { error: 'admin_not_configured' });
  const ip = String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const recent = attempts.get(ip);
  if (recent && recent.until > now && recent.count >= 5) return send(res, 429, { error: 'too_many_attempts' });
  const body = req.body;
  if (!passwordMatches(body?.password)) {
    attempts.set(ip, { count: recent && recent.until > now ? recent.count + 1 : 1, until: now + 15 * 60_000 });
    return send(res, 401, { error: 'wrong_password' });
  }
  attempts.delete(ip);
  const xUrl = body?.xUrl, ca = body?.ca;
  if (typeof xUrl !== 'string' || typeof ca !== 'string' || xUrl.length > 200 || ca.length > 44 ||
      !validX(xUrl.trim()) || !validCA(ca.trim())) return send(res, 400, { error: 'invalid_values' });
  const config: Config = { xUrl: xUrl.trim(), ca: ca.trim() };
  try {
    const { sha } = await githubFile(token);
    const branch = process.env.PRISMA_CONFIG_BRANCH || 'fix-preflight-build-check';
    const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: 'PUT', headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Update Prisma social link and token CA',
        content: Buffer.from(JSON.stringify(config, null, 2) + '\n').toString('base64'), sha, branch }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return send(res, 502, { error: 'github_save_failed', status: response.status });
    return send(res, 200, { ok: true, config });
  } catch { return send(res, 502, { error: 'github_unavailable' }); }
}
