import type { PublicKey, VersionedTransaction } from '@solana/web3.js';

export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction?: (transaction: VersionedTransaction) => Promise<{ signature: string }>;
  on?: (event: 'accountChanged' | 'disconnect', listener: (key?: PublicKey | null) => void) => void;
  off?: (event: 'accountChanged' | 'disconnect', listener: (key?: PublicKey | null) => void) => void;
};
