# Prisma

Prisma is a tokenized equity lending interface for Solana. The visual app keeps its own Markets, Vaults, Stake, Claim, Docs and FAQ screens. Most of the market catalogue, rates, loan limits, price ages and quote calculator are illustrative previews, not data from an oracle or a lending program.

## Protocol strategy

Prisma uses Kamino Lend behind its own interface instead of deploying a separate lending program. For NVDA, AAPL, GOOGL, TSLA, SPY, QQQ and MSTR, the modal looks for a matching xStock / USDC reserve at runtime. A ticker displays live reserve data only when the listing and reserve metrics match its token mint and the USDC borrow reserve. The rest of the catalogue and the original USDG quote preview remain illustrative.

The transaction path for verified markets builds an action with the pinned Kamino SDK, checks mainnet genesis and reserve mints, validates wallet token balance or an existing obligation, then simulates a one-signer transaction. The user reviews amount, market, estimated fee and limits before Phantom signs and sends it. Supply, collateral deposit, borrow, withdraw, collateral removal and repay share this path. The server never holds a private key. The public mainnet RPC is used by default and may rate limit; `PRISMA_MAINNET_RPC` can point the server to another HTTPS mainnet endpoint. The browser confirmation uses the public RPC. A successful build or simulation is not proof of a confirmed transaction; the signature is checked after Phantom sends it.

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

The frontend uses hash routes, but verified markets and transaction preparation need the `/api/live-market`, `/api/live-position` and `/api/kamino-prepare` server functions. The illustrative `/api/markets` and `/api/quote` endpoints also require server functions. `/api/kamino-market` is an older discovery probe and is not used in the interface.
