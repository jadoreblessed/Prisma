# Prisma Solana mainnet release

This package deploys one isolated `NVDAx / USDC` market. The initializer always writes `paused = true`, `supply_cap = 0`, and `borrow_cap = 0`; deployment alone cannot accept deposits or create loans.

## Required before running

- Solana CLI and Anchor `0.31.1`
- a dedicated deploy wallet at `~/.config/solana/prisma-mainnet.json`
- a private mainnet RPC in `SOLANA_MAINNET_RPC` (public RPC is unsuitable for deployment)
- enough SOL for program deployment and account rent
- the deploy wallet backed up offline; never paste its seed into a website or `.env`

## Two commands

```bash
npm --prefix protocol install
bash scripts/release-mainnet.sh
```

The script refuses a non-mainnet genesis hash, verifies the official NVDAx and USDC mints, resolves and verifies the Chainlink feed, builds twice after `anchor keys sync`, deploys, initializes the market, and checks the paused/zero-cap invariant.

## Before activation

Do not raise caps until all of the following are complete: independent smart-contract audit, Token-2022 Scaled UI Amount review, oracle failure simulation, liquidation keeper deployment, multisig authority handoff, legal review for allowed jurisdictions, and a small capped beta. `mainnet/market.json` and `mainnet/deployment.json` are generated release records and must be reviewed before signing any activation transaction.

