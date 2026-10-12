#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WALLET_PATH="${ANCHOR_WALLET:-$HOME/.config/solana/prisma-mainnet.json}"
RPC_URL="${SOLANA_MAINNET_RPC:-}"
FEED="${PRISMA_CHAINLINK_FEED:-}"
PROGRAM_KEYPAIR="${PRISMA_PROGRAM_KEYPAIR:-$ROOT_DIR/mainnet/keys/prisma_lending-keypair.json}"
CONFIRMED=0
SKIP_INSTALL=0

usage() {
  cat <<'EOF'
Usage:
  bash scripts/release-mainnet.sh --wallet /path/to/deployer.json --rpc https://your-mainnet-rpc [--feed CHAINLINK_FEED] [--confirm-mainnet]

The release always initializes NVDAx/USDC PAUSED with supply and borrow caps set to 0.
It never activates the market or transfers upgrade/market authority.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wallet) WALLET_PATH="$2"; shift 2 ;;
    --rpc) RPC_URL="$2"; shift 2 ;;
    --feed) FEED="$2"; shift 2 ;;
    --program-keypair) PROGRAM_KEYPAIR="$2"; shift 2 ;;
    --confirm-mainnet) CONFIRMED=1; shift ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1"; usage; exit 64 ;;
  esac
done

for bin in solana solana-keygen anchor node npm shasum; do
  command -v "$bin" >/dev/null || { echo "Missing $bin. See mainnet/README.md for exact prerequisites."; exit 1; }
done
[[ -n "$RPC_URL" ]] || { echo "A private mainnet RPC is required. Pass --rpc or set SOLANA_MAINNET_RPC."; exit 1; }
[[ -f "$WALLET_PATH" ]] || { echo "Deploy wallet not found: $WALLET_PATH"; exit 1; }

if [[ "$CONFIRMED" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    echo "Refusing an unattended mainnet deployment without --confirm-mainnet."
    exit 1
  fi
  echo "This will spend real SOL and deploy an upgradeable program to Solana mainnet-beta."
  read -r -p "Type DEPLOY PRISMA MAINNET to continue: " confirmation
  [[ "$confirmation" == "DEPLOY PRISMA MAINNET" ]] || { echo "Cancelled."; exit 1; }
fi

cd "$ROOT_DIR"
export SOLANA_MAINNET_RPC="$RPC_URL"
export ANCHOR_PROVIDER_URL="$RPC_URL"
export ANCHOR_WALLET="$WALLET_PATH"
export PRISMA_PROGRAM_KEYPAIR="$PROGRAM_KEYPAIR"
[[ -z "$FEED" ]] || export PRISMA_CHAINLINK_FEED="$FEED"

if [[ "$SKIP_INSTALL" -ne 1 ]]; then
  npm --prefix protocol ci
fi

echo "[1/7] Verifying wallet, RPC, mints, oracle and safe configuration…"
npm --prefix protocol run preflight

mkdir -p "$(dirname "$PROGRAM_KEYPAIR")" target/deploy
chmod 700 "$(dirname "$PROGRAM_KEYPAIR")"
if [[ -f "$PROGRAM_KEYPAIR" ]]; then
  cp "$PROGRAM_KEYPAIR" target/deploy/prisma_lending-keypair.json
fi

echo "[2/7] Building the release binary…"
anchor build
if [[ ! -f "$PROGRAM_KEYPAIR" ]]; then
  cp target/deploy/prisma_lending-keypair.json "$PROGRAM_KEYPAIR"
  chmod 600 "$PROGRAM_KEYPAIR"
  echo "Created persistent program keypair: $PROGRAM_KEYPAIR"
  echo "BACK IT UP. Losing it does not lose funds, but it loses this undeployed program address."
fi
cp "$PROGRAM_KEYPAIR" target/deploy/prisma_lending-keypair.json
anchor keys sync
anchor build

PROGRAM_ID="$(solana address -k "$PROGRAM_KEYPAIR")"
export PRISMA_PROGRAM_ID="$PROGRAM_ID"
SO_PATH="$ROOT_DIR/target/deploy/prisma_lending.so"
[[ -f "$SO_PATH" ]] || { echo "Build artifact missing: $SO_PATH"; exit 1; }
export PRISMA_PROGRAM_SO="$SO_PATH"

echo "[3/7] Checking the built program size and required SOL…"
npm --prefix protocol run preflight

echo "Program ID: $PROGRAM_ID"
echo "Binary SHA-256: $(shasum -a 256 "$SO_PATH" | awk '{print $1}')"
echo "The market will remain PAUSED with both caps at ZERO."

echo "[4/7] Resolving and verifying the official oracle configuration…"
npm --prefix protocol run resolve

echo "[5/7] Deploying/upgrading program…"
anchor deploy --provider.cluster "$RPC_URL" --provider.wallet "$WALLET_PATH"

echo "[6/7] Creating and verifying the paused market…"
npm --prefix protocol run initialize
npm --prefix protocol run verify
solana program show "$PROGRAM_ID" --url "$RPC_URL" --output json > mainnet/program.json
DEPLOYER_ADDRESS="$(solana address -k "$WALLET_PATH")"
PROGRAM_AUTHORITY="$(node -e "const fs=require('fs');const x=JSON.parse(fs.readFileSync('mainnet/program.json','utf8'));process.stdout.write(String(x.authority||x.upgradeAuthority||''))")"
[[ "$PROGRAM_AUTHORITY" == "$DEPLOYER_ADDRESS" ]] || { echo "Unexpected program upgrade authority: $PROGRAM_AUTHORITY"; exit 1; }

echo "[7/7] Exporting addresses for the web deployment…"
npm --prefix protocol run export-env

echo
echo "Prisma mainnet deployment completed safely."
echo "Program: $PROGRAM_ID"
echo "Market:  $(node -p "require('./mainnet/deployment.json').market")"
echo "State:   PAUSED / SUPPLY CAP 0 / BORROW CAP 0"
echo "Records: mainnet/deployment.json, mainnet/program.json, mainnet/frontend.env"
echo "No user funds can enter until a separate audited activation transaction is executed."
