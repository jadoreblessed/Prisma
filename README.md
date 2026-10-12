# Prisma

Prisma is a tokenized equity lending interface for Solana. The visual app keeps its own Markets, Vaults, Stake, Claim, Docs and FAQ screens. The market catalogue, rates, loan limits, price ages and quote calculator are illustrative previews, not data from an oracle or a lending program.

## Protocol strategy

Prisma will integrate existing Solana lending protocols behind its own interface instead of deploying a separate lending program. Kamino already has an xStocks market with NVDAx collateral. Its public API can discover the market, but the current frontend does **not** submit Kamino transactions. Wallet connection only connects Phantom to the Prisma page; quote previews never produce executable transactions. There are no external protocol links in the app.

For a production integration, map every displayed market to verified protocol market and reserve addresses, fetch rates, caps and positions from that source, build transactions using an official supported SDK or transaction API, review them in the connected wallet and verify confirmations on Solana. Show a price age only after confirming the timestamp comes from the oracle that the underlying lending market actually uses. Kamino's xStocks market uses Chainlink Data Streams; a different Pyth ticker's `publish_time` cannot stand in for that timestamp.

Vaults, Stake and Claim are nonfunctional previews. The archived custom program under `programs/` and `protocol/` was not deployed. `scripts/release-mainnet.sh` exits before spending SOL.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The frontend uses hash routes and can be served statically. The illustrative `/api/markets` and `/api/quote` endpoints require a host with server functions. `/api/kamino-market` is a server-side discovery probe and is not currently used in the interface.
