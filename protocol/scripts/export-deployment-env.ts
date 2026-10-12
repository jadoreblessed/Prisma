import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './common.js';

const deployment = JSON.parse(await readFile(resolve(root, 'mainnet/deployment.json'), 'utf8'));
const lines = [
  `PRISMA_PROGRAM_ID=${deployment.programId}`,
  `PRISMA_MARKET_ADDRESS=${deployment.market}`,
  `VITE_PRISMA_PROGRAM_ID=${deployment.programId}`,
  `VITE_PRISMA_MARKET_ADDRESS=${deployment.market}`,
  `VITE_PRISMA_COLLATERAL_MINT=${deployment.collateralMint}`,
  `VITE_PRISMA_BORROW_MINT=${deployment.borrowMint}`,
  `VITE_PRISMA_CHAINLINK_FEED=${deployment.oracle}`,
  'VITE_PRISMA_CLUSTER=mainnet-beta',
  'VITE_PRISMA_TRANSACTIONS_ENABLED=false',
];
await writeFile(resolve(root, 'mainnet/frontend.env'), lines.join('\n') + '\n', { mode: 0o600 });
console.log('Wrote mainnet/frontend.env (transactions remain disabled).');
