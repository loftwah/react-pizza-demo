# React Pizza Demo

A full-stack-of-the-front-end demo project that walks from the classic CDN React setup to a production-ready Vite + TypeScript + Tailwind app. It doubles as the hands-on companion for the learning guide in `LEARNING_GUIDE.md`.

## Stack

- React 19 with JSX + Strict Mode
- Vite 5 for dev server and builds
- TypeScript with strict settings (`moduleResolution: bundler`, type-only imports)
- Tailwind CSS (via the official Vite plugin)
- React Router for client-side navigation
- React Query for data fetching and caching
- Zustand for the pizza cart store
- MDX for content-rich pages
- clsx for expressive conditional styling

## Getting Started

```bash
npm install
npm run dev
```

Build & preview production output:

```bash
npm run build
npm run preview
```

## Project Layout

```
src/
  App.tsx            # Routes + layout
  main.tsx           # Bootstraps React, Router, React Query
  components/        # Header, Layout, PizzaCard, etc.
  domain/            # Pizza types, menu data, pricing helpers
  hooks/             # useMenu hook powered by React Query
  pages/             # MenuPage (TSX) and About (MDX)
  stores/            # Zustand cart store
  mdx.d.ts           # Type support for MDX imports
```

Refer to `learning-guide.md` for the full walkthrough from the zero-build CDN version to this modern stack, including rationale for each tooling decision and pointers on how to experiment further.
