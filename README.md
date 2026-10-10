# Prisma landing page

A cinematic, scroll-driven homepage for Prisma. Built with Vite, React 18, TypeScript, and Tailwind CSS. The three visual scenes and their typography are synchronized to page scroll. The glass-style buttons respond to pointer position.

## Run locally

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

Publish the `dist` directory on any static host. The landing page's `Launch app`, `Markets`, and `Docs` links currently open the existing Prisma application at `prisma-credit.jadorealure.chatgpt.site`; update the URLs near the top of `src/App.tsx` if the app moves. Market cards contain illustrative preview data, not a live feed.

The original Ascend screen recording was used as a layout and motion reference. The three background plates in `public/assets` are separate generated assets with no embedded UI or text.
