# Prisma

A cinematic landing and market interface for Prisma, built with Vite, React 18, TypeScript and Tailwind CSS.

The supplied Ascend recording is used for the moving glass sculpture. The footage is encoded with frequent keyframes, remains paused, and its `currentTime` follows scroll progress. Scene masks keep the reference's copy and cards out of the Prisma layout. Still images in `public/assets` appear only while the video loads or if it cannot play.

`#/markets` and `#/docs` are pages inside this project. The markets list is an illustrative snapshot with unique assets, search, category tabs and a detail view. Wallet actions show a prototype notice; no transaction or live oracle is connected.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Publish the `dist` directory to any static host. Hash routes work without server rewrites.
