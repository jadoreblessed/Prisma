# Prisma Solana mainnet release

**DO NOT DEPLOY THE CURRENT PROGRAM FOR NVDAx.** xStocks reports a Solana `PullBased` Chainlink Data Stream with v10 report schema, feed ID `0x000a37a55df2ef907d8fa06af6632bc16da58a62b68be2e1994efaa037a0918a`, and `address: null`. This program reads push-feed accounts (`read_feed_v2`) and cannot consume this stream. Its current oracle configuration is incompatible even if a different feed address is manually supplied. The release script now stops before building or spending SOL.

To unblock a release, implement signed v10 report retrieval and onchain verification through the official Solana Data Streams verifier for each price-dependent instruction; verify the exact feed ID, report expiry, observation timestamp, underlying-price timestamp, market status, decimals and corporate-action multiplier. Obtain Data Streams mainnet credentials entitled to this feed and test the full transaction flow and liquidations before allowing nonzero caps. Do not substitute an offchain API price or the verifier program ID for an oracle account.

The planned market remains fail-closed: its initializer writes `paused = true`, `supply_cap = 0`, and `borrow_cap = 0`.

## Strict 0.05 SOL deployment ceiling

The preflight refuses a deployer funded with more than 0.05 SOL and, after the `.so` is built, refuses a conservative rent-plus-fees estimate above 0.05 SOL before submitting transactions. Use a dedicated deploy keypair; never move a seed phrase to the frontend. This ceiling does not make an unsupported oracle safe or guarantee that a program of arbitrary size can be deployed. The current NVDAx oracle incompatibility remains a separate hard stop.

To estimate rent without spending SOL after building, run `wc -c < target/deploy/prisma_lending.so` and `solana rent <PROGRAM_DATA_BYTES> --url <MAINNET_RPC>`; the release estimates program data at twice the compiled size plus 48 bytes and also budgets market/vault accounts and fees. Solana may require more for an interrupted/retried deployment, so the dedicated wallet limit is the final bound on actual spending.

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
10. exports the public addresses, verified state and matching Anchor IDL for the web app. Transactions remain disabled while the market is paused or either cap is zero.

The release is idempotent: rerunning it uses the preserved program keypair, upgrades the same program if the deploy wallet still controls it, and validates the existing market instead of creating a second one.

## Prerequisites

- Node.js 22+
- Solana/Agave CLI `2.1.0` with `solana` and `solana-keygen`
- Anchor CLI `0.31.1`
- a dedicated JSON deploy keypair stored locally
- a private Solana mainnet RPC endpoint
- enough SOL for the calculated program rent and transaction fees
- Chainlink Data Streams mainnet subscription and feed entitlement (required for the future v10 integration; do not share credentials)

Do not put a seed phrase, private key, RPC secret, or keypair JSON in Git or in a frontend environment variable.

## Deployment

Install the small release client once:

```bash
npm --prefix protocol ci
```

The command below is intentionally blocked until the v10 integration is implemented and reviewed. Do not run it now:

```bash
bash scripts/release-mainnet.sh \
  --wallet "$HOME/.config/solana/prisma-mainnet.json" \
  --rpc "https://YOUR-PRIVATE-MAINNET-RPC"
```

The script asks for the exact confirmation phrase before spending SOL. For CI or another non-interactive terminal, add `--confirm-mainnet`. After the first successful build, back up `mainnet/keys/prisma_lending-keypair.json` offline.

Generated files:

- `mainnet/market.json` — verified release configuration
- `mainnet/deployment.json` — program, market, vaults, oracle and initialization signature
- `mainnet/program.json` — onchain program/upgrade-authority record from the Solana CLI
- `mainnet/frontend.env` — public frontend/server addresses; transactions remain disabled
- `public/protocol/deployment.json` — browser-safe runtime state and public addresses
- `public/protocol/prisma_lending.json` — the exact IDL built for the deployed program

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

The values are raw USDC base units. The example above is illustrative, not a recommended risk limit. The activation command re-reads the resulting state, fails if it does not match, and refreshes the browser manifest. Rebuild/redeploy the web app after configuration. Set `VITE_SOLANA_RPC_URL` on the web host to a browser-allowed production RPC; never embed an admin RPC secret.

## Production boundary

The repository gives you a reproducible, fail-closed deployment package. It does not replace an independent smart-contract audit, economic-risk review, legal advice, monitoring, an oracle incident runbook, or a funded liquidation keeper. Keep the market paused until those are complete.
