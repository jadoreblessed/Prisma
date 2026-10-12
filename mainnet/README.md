# Prisma Solana mainnet release

This repository is prepared to deploy one isolated `NVDAx / USDC` market. Deployment is fail-closed: the initializer always writes `paused = true`, `supply_cap = 0`, and `borrow_cap = 0`. Deploying the program cannot accept deposits or create loans.

## What the release command does

1. refuses every cluster except Solana mainnet-beta by checking the genesis hash;
2. loads the deployer only from a local keypair path;
3. validates the official NVDAx Token-2022 mint and classic SPL USDC mint;
4. rejects transfer-fee, transfer-hook, confidential-transfer and non-transferable collateral extensions that would break vault accounting;
5. validates the Chainlink account owner;
6. calculates a conservative program-rent budget and checks the wallet balance;
7. creates and preserves a dedicated program keypair under `mainnet/keys/`;
8. builds twice around `anchor keys sync`, deploys, and initializes the market;
9. re-reads every address and safety invariant from mainnet;
10. exports the public addresses to `mainnet/frontend.env` with transactions disabled.

The release is idempotent: rerunning it uses the preserved program keypair, upgrades the same program if the deploy wallet still controls it, and validates the existing market instead of creating a second one.

## Prerequisites

- Node.js 22+
- Solana/Agave CLI with `solana` and `solana-keygen`
- Anchor CLI `0.31.1`
- a dedicated JSON deploy keypair stored locally
- a private Solana mainnet RPC endpoint
- enough SOL for the calculated program rent and transaction fees
- the official NVDAx/USD Chainlink feed address if the xStocks discovery API is unavailable

Do not put a seed phrase, private key, RPC secret, or keypair JSON in Git or in a frontend environment variable.

## Deployment

Install the small release client once:

```bash
npm --prefix protocol ci
```

Then deploy:

```bash
bash scripts/release-mainnet.sh \
  --wallet "$HOME/.config/solana/prisma-mainnet.json" \
  --rpc "https://YOUR-PRIVATE-MAINNET-RPC" \
  --feed "OFFICIAL_NVDAx_USD_CHAINLINK_FEED"
```

The script asks for the exact confirmation phrase before spending SOL. For CI or another non-interactive terminal, add `--confirm-mainnet`. After the first successful build, back up `mainnet/keys/prisma_lending-keypair.json` offline.

Generated files:

- `mainnet/market.json` — verified release configuration
- `mainnet/deployment.json` — program, market, vaults, oracle and initialization signature
- `mainnet/program.json` — onchain program/upgrade-authority record from the Solana CLI
- `mainnet/frontend.env` — public frontend/server addresses; transactions remain disabled

## Read-only status

```bash
export ANCHOR_PROVIDER_URL="https://YOUR-PRIVATE-MAINNET-RPC"
export SOLANA_MAINNET_RPC="$ANCHOR_PROVIDER_URL"
export ANCHOR_WALLET="$HOME/.config/solana/prisma-mainnet.json"
npm --prefix protocol run status
```

## Authority handoff

The market authority uses a two-step handoff:

```bash
PRISMA_NEW_MARKET_AUTHORITY="NEW_AUTHORITY_PUBKEY" npm --prefix protocol run propose-authority
# Run from the new authority wallet:
npm --prefix protocol run accept-authority
```

Program upgrade authority is separate from market authority. Transfer it only after verifying the new signer/multisig procedure:

```bash
solana program set-upgrade-authority PROGRAM_ID \
  --new-upgrade-authority /path/to/new-authority.json \
  --keypair /path/to/current-deployer.json \
  --url "https://YOUR-PRIVATE-MAINNET-RPC"
```

Do not use `--final` unless you intentionally want to make the program permanently immutable.

## Deliberate activation gate

Activation is not part of deployment. After an independent audit, oracle failure tests, Token-2022 review, liquidation operations, multisig handoff, legal review, monitoring and a capped beta plan, the market authority can configure caps and unpause:

```bash
export PRISMA_ACTIVATION_ACK=I_ACCEPT_MAINNET_RISK
export PRISMA_SUPPLY_CAP_BASE_UNITS=1000000000
export PRISMA_BORROW_CAP_BASE_UNITS=500000000
export PRISMA_UNPAUSE=true
npm --prefix protocol run configure
```

The values are raw USDC base units. The example above is illustrative, not a recommended risk limit. The activation command re-reads the resulting state and fails if it does not match.

## Production boundary

The repository gives you a reproducible, fail-closed deployment package. It does not replace an independent smart-contract audit, economic-risk review, legal advice, monitoring, an oracle incident runbook, or a funded liquidation keeper. Keep the market paused until those are complete.
