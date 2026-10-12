import { AnchorProvider, BN, Program, type Idl, type Wallet } from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';

export type ProtocolDeployment = {
  schemaVersion: number;
  configured: boolean;
  cluster: 'mainnet-beta';
  symbol?: string;
  programId?: string;
  market?: string;
  collateralMint?: string;
  borrowMint?: string;
  oracle?: string;
  collateralVault?: string;
  liquidityVault?: string;
  paused: boolean;
  supplyCapBaseUnits: string;
  borrowCapBaseUnits: string;
  transactionsEnabled: boolean;
  exportedAt?: string;
};

export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
};

export type ProtocolAction = 'supply' | 'depositCollateral' | 'borrow' | 'repay';

const MAINNET_RPC = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const encoder = new TextEncoder();

export async function loadProtocolDeployment(): Promise<ProtocolDeployment> {
  const response = await fetch('/protocol/deployment.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Protocol deployment manifest is unavailable.');
  return response.json() as Promise<ProtocolDeployment>;
}

function requireAddress(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is missing from the published deployment.`);
  return new PublicKey(value);
}

function parseTokenAmount(value: string, decimals: number) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error('Enter a valid positive amount.');
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) throw new Error(`This token supports at most ${decimals} decimal places.`);
  const units = BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0');
  if (units <= 0n || units > 18_446_744_073_709_551_615n) throw new Error('Amount is outside the supported range.');
  return units;
}

async function runtime(provider: PhantomProvider, deployment: ProtocolDeployment) {
  if (!deployment.configured || !deployment.transactionsEnabled || deployment.paused) {
    throw new Error('This market is not active on mainnet yet.');
  }
  if (!provider.publicKey) await provider.connect();
  if (!provider.publicKey) throw new Error('Wallet connection failed.');

  const idlResponse = await fetch('/protocol/prisma_lending.json', { cache: 'no-store' });
  if (!idlResponse.ok) throw new Error('Published program IDL is unavailable.');
  const idl = await idlResponse.json() as Idl;
  const connection = new Connection(MAINNET_RPC, { commitment: 'confirmed', confirmTransactionInitialTimeout: 120_000 });
  const wallet = {
    publicKey: provider.publicKey,
    signTransaction: provider.signTransaction.bind(provider),
    signAllTransactions: provider.signAllTransactions.bind(provider),
  } as unknown as Wallet;
  const anchorProvider = new AnchorProvider(connection, wallet, { commitment: 'confirmed', preflightCommitment: 'confirmed' });
  const program = new Program(idl, anchorProvider) as Program<Idl>;
  if (program.programId.toBase58() !== deployment.programId) throw new Error('Published IDL does not match the deployment manifest.');
  return { connection, program, user: provider.publicKey };
}

function assertTokenProgram(owner: PublicKey, label: string) {
  if (owner.equals(TOKEN_PROGRAM_ID) || owner.equals(TOKEN_2022_PROGRAM_ID)) return owner;
  throw new Error(`${label} is not owned by a supported Solana token program.`);
}

export async function executeProtocolAction(
  provider: PhantomProvider,
  deployment: ProtocolDeployment,
  action: ProtocolAction,
  amountText: string,
) {
  const { connection, program, user } = await runtime(provider, deployment);
  const market = requireAddress(deployment.market, 'market');
  const collateralMint = requireAddress(deployment.collateralMint, 'collateral mint');
  const borrowMint = requireAddress(deployment.borrowMint, 'borrow mint');
  const oracle = requireAddress(deployment.oracle, 'oracle');
  const collateralVault = requireAddress(deployment.collateralVault, 'collateral vault');
  const liquidityVault = requireAddress(deployment.liquidityVault, 'liquidity vault');
  const [collateralInfo, borrowInfo] = await connection.getMultipleAccountsInfo([collateralMint, borrowMint]);
  if (!collateralInfo || !borrowInfo) throw new Error('A configured token mint is missing.');
  const collateralTokenProgram = assertTokenProgram(collateralInfo.owner, 'Collateral mint');
  const borrowTokenProgram = assertTokenProgram(borrowInfo.owner, 'Borrow mint');
  const amountMint = action === 'depositCollateral' ? collateralMint : borrowMint;
  const amountProgram = action === 'depositCollateral' ? collateralTokenProgram : borrowTokenProgram;
  const mint = await getMint(connection, amountMint, 'confirmed', amountProgram);
  const amount = new BN(parseTokenAmount(amountText, mint.decimals).toString());
  const userCollateralAccount = getAssociatedTokenAddressSync(collateralMint, user, false, collateralTokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
  const userBorrowAccount = getAssociatedTokenAddressSync(borrowMint, user, false, borrowTokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
  const [position] = PublicKey.findProgramAddressSync([encoder.encode('position'), market.toBytes(), user.toBytes()], program.programId);
  const [lender] = PublicKey.findProgramAddressSync([encoder.encode('lender'), market.toBytes(), user.toBytes()], program.programId);
  const ata = action === 'depositCollateral' ? userCollateralAccount : userBorrowAccount;
  const ataMint = action === 'depositCollateral' ? collateralMint : borrowMint;
  const ataProgram = action === 'depositCollateral' ? collateralTokenProgram : borrowTokenProgram;
  const createAta = createAssociatedTokenAccountIdempotentInstruction(user, ata, user, ataMint, ataProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
  const methods = program.methods as any;

  if (action === 'supply') {
    return methods.supply(amount).accountsStrict({ user, market, borrowMint, userBorrowAccount, liquidityVault, lender, borrowTokenProgram, systemProgram: SystemProgram.programId }).preInstructions([createAta]).rpc();
  }
  if (action === 'depositCollateral') {
    return methods.depositCollateral(amount).accountsStrict({ user, market, collateralMint, userCollateralAccount, collateralVault, position, collateralTokenProgram, systemProgram: SystemProgram.programId }).preInstructions([createAta]).rpc();
  }
  if (action === 'borrow') {
    return methods.borrow(amount).accountsStrict({ user, market, collateralMint, borrowMint, oracle, position, liquidityVault, userBorrowAccount, borrowTokenProgram }).preInstructions([createAta]).rpc();
  }
  return methods.repay(amount).accountsStrict({ user, market, borrowMint, position, liquidityVault, userBorrowAccount, borrowTokenProgram }).preInstructions([createAta]).rpc();
}

