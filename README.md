# Prisma

Prisma is a tokenized equity lending interface for Solana. The visual app keeps its own Markets, Vaults, Stake, Claim, Docs and FAQ screens. The market catalogue, rates, loan limits, price ages and quote calculator are illustrative previews, not data from an oracle or a lending program.

## Protocol strategy

Prisma is preparing to use an existing Solana lending protocol behind its own interface instead of deploying a separate lending program. For NVDA, AAPL, GOOGL, TSLA, SPY, QQQ and MSTR, the modal looks for a matching xStock / USDC reserve at runtime. A ticker displays live reserve data only when the official listing and reserve metrics match its token mint and the USDC borrow reserve. No external protocol links appear in the app. The rest of the catalogue and the original USDG quote preview remain illustrative. Prisma does not currently prepare, sign or submit onchain transactions.

For the remaining catalogue, map every displayed market to verified protocol market and reserve addresses before enabling actions. Fetch positions and rates from their actual reserves. Show a live price age only after confirming the timestamp comes from the oracle that the underlying lending market actually uses. Kamino's xStocks market uses Chainlink Data Streams; a different Pyth ticker's `publish_time` cannot stand in for that timestamp.

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

## Kamino instruction preflight

The read-only preflight builds an instruction with Kamino's SDK, checks the onchain market and reserve mints, then simulates the result. It does not sign or send a transaction. For borrowing, it requires the wallet's existing xStock collateral in the corresponding vanilla obligation. A simulation failure must not be treated as an executable quote.

```bash
PRISMA_MAINNET_RPC=https://YOUR_MAINNET_RPC \
  npx tsx scripts/check-kamino-action.ts NVDA supply 1 WALLET_PUBLIC_KEY
```

Use `collateral` for an xStock deposit and `borrow` for a USDC borrowing preflight. An unfunded address will fail simulation because it cannot pay the transaction fee. The frontend remains read-only; these checks do not enable Supply or Borrow for users.

The frontend uses hash routes and can be served statically, but live reserve data needs the `/api/live-market` server function. The illustrative `/api/markets` and `/api/quote` endpoints also require server functions. `/api/kamino-market` is an older discovery probe and is not used in the interface.
