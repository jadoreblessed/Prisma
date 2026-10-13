export default function handler(_req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html><head><title>Prisma API check</title></head><body><h1>Prisma API ready</h1></body></html>');
}
