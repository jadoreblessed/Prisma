# Prisma

Prisma is an isolated lending interface and Solana program for tokenized equities. The first prepared market is `NVDAx / USDC` on Solana mainnet-beta. The program supports Token-2022 collateral, classic SPL liquidity, lender and debt shares, fixed-rate interest accrual, Chainlink price validation, isolated risk limits, liquidation, caps, emergency pause, and a two-step authority transfer.

The website includes the landing page, Markets, Vaults, Stake, Claim, Docs and FAQ views. Phantom connection and server-side quote previews are enabled. Onchain transaction buttons remain disabled until a deployed market address is published.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Solana mainnet release

The release is intentionally fail-closed. Initialization always creates a paused market with both caps set to zero, so deployment cannot accept USDC or NVDAx.

```bash
npm --prefix protocol ci
bash scripts/release-mainnet.sh --wallet /path/to/deployer.json --rpc https://YOUR-RPC --feed OFFICIAL_CHAINLINK_FEED
```

The script verifies the Solana mainnet genesis hash, deploy wallet balance, official mint owners, incompatible Token-2022 extensions, Chainlink feed owner, binary size and every post-deploy address before it succeeds. It stores a reproducible deployment record and keeps transactions disabled. See `mainnet/README.md` for the exact command, wallet/RPC requirements, authority handoff and the separate activation gate.

Publish `dist` to a static host. Hash routes work without server rewrites. WebGPU powers the hero shader when available and the video fallback keeps the page readable on unsupported devices.
