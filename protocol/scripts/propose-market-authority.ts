import { PublicKey } from '@solana/web3.js';
import { assertMainnet, anchorProgram, marketAddresses, readConfig } from './common.js';

const nextText = process.env.PRISMA_NEW_MARKET_AUTHORITY;
if (!nextText) throw new Error('Set PRISMA_NEW_MARKET_AUTHORITY to the new authority public key.');
const next = new PublicKey(nextText);
const config = await readConfig();
const { provider, program } = await anchorProgram();
await assertMainnet(provider.connection);
const { market } = marketAddresses(program.programId, new PublicKey(config.collateralMint), new PublicKey(config.borrowMint));
const signature = await program.methods.proposeAuthority(next).accountsStrict({ market, authority: provider.wallet.publicKey }).rpc();
console.log(JSON.stringify({ signature, market: market.toBase58(), pendingAuthority: next.toBase58() }, null, 2));
