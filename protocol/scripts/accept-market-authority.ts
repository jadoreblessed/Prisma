import { PublicKey } from '@solana/web3.js';
import { assertMainnet, anchorProgram, marketAddresses, readConfig } from './common.js';

const config = await readConfig();
const { provider, program } = await anchorProgram();
await assertMainnet(provider.connection);
const { market } = marketAddresses(program.programId, new PublicKey(config.collateralMint), new PublicKey(config.borrowMint));
const before = await (program.account as any).market.fetch(market) as any;
if (!before.pendingAuthority.equals(provider.wallet.publicKey)) throw new Error('Connected wallet is not the pending market authority.');
const signature = await program.methods.acceptAuthority().accountsStrict({ market, pendingAuthority: provider.wallet.publicKey }).rpc();
console.log(JSON.stringify({ signature, market: market.toBase58(), authority: provider.wallet.publicKey.toBase58() }, null, 2));
