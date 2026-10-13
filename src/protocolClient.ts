import type { PublicKey } from '@solana/web3.js';

// The current Prisma interface is read-only. Keep only Phantom's public
// connection surface here; signing and transaction submission belong in a
// separately reviewed Kamino integration and are intentionally not exposed.
export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
};
