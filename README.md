# Prisma

Prisma's landing page uses the Axion-inspired layout supplied in the brief, adapted to tokenized equity lending. The first screen combines a four-layer animated shader with a pill navigation and direct market CTA. The following sections explain isolated markets and price age.

The Markets and Docs views are part of the same app at `#/markets` and `#/docs`. The market list is an illustrative snapshot with search, category tabs and detail views. Wallet actions show a prototype notice; no transaction or live oracle is connected.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Publish `dist` to a static host. The hash routes work without server rewrites. WebGPU is used for the hero shader when available; the light gray background remains readable if it is unavailable.
