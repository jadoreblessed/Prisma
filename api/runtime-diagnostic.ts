export default async function handler(_req: any, res: any) {
  const modules = ['@solana/web3.js', '@solana/kit', '@kamino-finance/klend-sdk', './_live-market', './live-market'];
  const results: Record<string, string> = {};
  for (const name of modules) {
    try { await import(name); results[name] = 'ok'; }
    catch (error) { results[name] = error instanceof Error ? error.name + ': ' + error.message : String(error); }
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(results));
}
