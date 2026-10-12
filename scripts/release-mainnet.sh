#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WALLET_PATH="${ANCHOR_WALLET:-$HOME/.config/solana/prisma-mainnet.json}"
RPC_URL="${SOLANA_MAINNET_RPC:-https://api.mainnet-beta.solana.com}"

for bin in solana anchor node npm; do
  command -v "$bin" >/dev/null || { echo "Missing $bin. Install the official Solana + Anchor toolchain first."; exit 1; }
done
test -f "$WALLET_PATH" || { echo "Mainnet deploy wallet not found: $WALLET_PATH"; exit 1; }

cd "$ROOT_DIR"
export ANCHOR_PROVIDER_URL="$RPC_URL"
export ANCHOR_WALLET="$WALLET_PATH"
solana config set --url "$RPC_URL" --keypair "$WALLET_PATH" >/dev/null

GENESIS="$(solana genesis-hash)"
test "$GENESIS" = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" || { echo "Refusing to deploy: RPC is not Solana mainnet."; exit 1; }

npm --prefix protocol run resolve
echo "Building deterministic mainnet binary…"
anchor build
anchor keys sync
anchor build
echo "Program will deploy PAUSED with zero supply and borrow caps."
anchor deploy --provider.cluster "$RPC_URL"
npm --prefix protocol run initialize

PROGRAM_ID="$(solana address -k target/deploy/prisma_lending-keypair.json)"
solana program show "$PROGRAM_ID"
echo "Prisma deployed safely. Market is PAUSED and cannot receive new supply or borrows."
echo "Deployment record: mainnet/deployment.json"

