# Prisma

Prisma is a tokenized equity lending discovery interface on Solana. The current working path uses **Kamino’s existing xStocks market** for NVDAx. There is no Prisma lending program to deploy, no new market to initialize, and no Prisma contract address to supply to a wallet.

The app checks Kamino’s public `/markets/collateral-reserves` endpoint for an NVDAx collateral row in the xStocks market. When found, it links to that market; if the API cannot be verified, it links to Kamino’s borrow directory so the user can find NVDAx there. Wallet connection, review and signing take place on Kamino. Check the token mint, rates, available liquidity, collateral rules and transaction prompt on Kamino before acting.

The site does **not** yet display live rates, loan limits, oracle price age or positions. A Pyth ticker is not necessarily the feed Kamino uses for its xStocks market, so Prisma does not substitute its `publish_time` for a verified Chainlink report timestamp. Vaults, Stake and Claim are nonfunctional previews.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The legacy `protocol/`, `programs/`, `mainnet/` and `scripts/` directories are archived work from the abandoned custom program approach. `scripts/release-mainnet.sh` exits before any deployment or SOL expenditure. Do not use archived mainnet release commands for the Kamino integration.

The frontend uses hash routes and can run on a static host. The API route requires a host that supports the `api/` server functions (for example the connected Vercel project). If the API route is unavailable, the market page safely falls back to Kamino’s directory.
