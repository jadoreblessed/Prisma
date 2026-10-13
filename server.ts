import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const port = Number(process.env.PORT || 3000);
const routes = new Set([
  'health', 'markets', 'kamino-market', 'live-market', 'live-position',
  'kamino-prepare', 'transaction-status', 'protocol', 'quote', 'site-config',
]);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8',
};

async function api(req: IncomingMessage, res: ServerResponse, name: string, url: URL) {
  if (!routes.has(name)) { res.writeHead(404).end(); return; }
  let body = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 65536) { res.writeHead(413).end(); return; }
    }
  }
  let parsed: unknown;
  try { parsed = body ? JSON.parse(body) : undefined; }
  catch { res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":"invalid_body"}'); return; }
  (req as IncomingMessage & { query: Record<string, string>; body: unknown }).query = Object.fromEntries(url.searchParams);
  (req as IncomingMessage & { body: unknown }).body = parsed;
  try {
    const handler = (await import(`./api/${name}.ts`)).default;
    await handler(req, res);
  } catch (error) {
    console.error('API route failed:', name, error);
    if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    if (!res.writableEnded) res.end('{"error":"service_unavailable"}');
  }
}

async function staticFile(req: IncomingMessage, res: ServerResponse, url: URL) {
  const requested = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (requested !== root && !requested.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  let file = requested;
  let stat;
  try { stat = await fs.stat(file); } catch { /* SPA fallback */ }
  if (!stat?.isFile()) {
    file = path.join(root, 'index.html');
    try { stat = await fs.stat(file); } catch { res.writeHead(404).end(); return; }
  }
  const size = stat.size;
  const contentType = types[path.extname(file)] || 'application/octet-stream';
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && size > 0) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2] || 0));
    const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return;
    }
    res.writeHead(206, { 'Content-Type': contentType, 'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res); return;
  }
  res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': size,
    'Accept-Ranges': 'bytes', 'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
  createReadStream(file).pipe(res);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const match = /^\/api\/([a-z-]+)$/.exec(url.pathname);
    if (match) await api(req, res, match[1], url);
    else if (url.pathname.startsWith('/api/')) res.writeHead(404).end();
    else await staticFile(req, res, url);
  } catch (error) {
    console.error('Request failed:', error);
    if (!res.headersSent) res.writeHead(500).end();
  }
}).listen(port, '0.0.0.0', () => console.log(`Prisma listening on ${port}`));
