# Loftwah Pizza – A React Demo Engine

> **Zero backend. Infinite demos. Full observability.**

A **production-grade, client-side e-commerce demo** built with **React 19**, **Vite**, **TypeScript**, **Tailwind**, and **Loftwah’s Coding Philosophy v1.6**.

This isn’t just a pizza shop — it’s a **repeatable, shareable, debuggable, voice-enabled, print-ready demo platform**.

Perfect for:

- Portfolio showcases
- Sales demos
- Onboarding walkthroughs
- Teaching modern React patterns

---

## Live Demo

**[loftwah.github.io/react-pizza-demo](https://loftwah.github.io/react-pizza-demo)**

---

## Features

| Feature                                    | Status |
| ------------------------------------------ | ------ |
| Shareable orders via URL (`?order=LP-XYZ`) | Done   |
| Voice order readout (Web Speech API)       | Done   |
| Print receipt (thermal-style)              | Done   |
| Copy order JSON                            | Done   |
| “Surprise Me” random pizza                 | Done   |
| Framer Motion animations                   | Done   |
| Dark mode + system sync                    | Done   |
| Responsive images (`srcset`)               | Done   |
| Keyboard navigation                        | Done   |
| Feature flags with expiry                  | Done   |
| Service pipeline with `run()`              | Done   |
| Doctor scripts                             | Done   |
| Smoke test                                 | Done   |

---

## Stack

- **React 19** + **Strict Mode**
- **Vite 5** + **HMR**
- **TypeScript** (`bundler` mode, strict)
- **Tailwind CSS 4** + `@tailwindcss/vite`
- **React Router 6**
- **React Query** (menu caching)
- **Zustand** (persisted cart + orders)
- **Framer Motion** (animations)
- **MDX** (content pages)
- **Lucide React** (icons)
- **clsx** (conditional classes)

---

## Getting Started

```bash
npm install
npm run dev
```

Build & preview production:

```bash
npm run build
npm run preview
```

Run the test suite (Vitest):

```bash
npm run test         # CI run
npm run test:watch   # Watch mode
npm run test:coverage
```

Deploy to GitHub Pages:

```bash
npm run deploy
```

---

## Project Layout

```
src/
  services/          # OrderService with run(), steps, describe()
  shared-utils/      # Result<T>, StepResult<T>, retry, telemetry
  config/            # features.ts (flags with expiry)
  stores/            # cart.ts, orders.ts (Zustand + persist)
  components/        # Header, Layout, PizzaCard, ErrorBoundary
  domain/            # menu.ts, pizza.ts (pure data)
  hooks/             # useMenu (React Query)
  pages/             # MenuPage.tsx, CheckoutPage.tsx, About.mdx
  providers/         # ThemeProvider, ToastProvider
  App.tsx            # Routes + layout
  main.tsx           # Bootstrap
  index.css          # Tailwind + print styles
  mdx.d.ts           # MDX types

bin/
  doctor-cart        # Health check: cart state
  doctor-orders      # Health check: order history
  smoke              # Local prod smoke test

scripts/
  check-flags.ts     # Enforce flag expiry
```

---

## Philosophy-Driven Architecture

Built with **Loftwah’s Coding Philosophy v1.6**:

```ts
// Every service has:
static steps = ['validate', 'generate', 'persist']
static describe() => steps
async run() → StepResult<T>
```

- **No magic**: `OrderService.describe()` shows the pipeline
- **Result pattern**: `ok | err | degraded`
- **Degraded states**: Analytics fail → order still submits
- **Doctor scripts**: `bin/doctor-cart` proves state
- **Smoke test**: `bin/smoke` runs prod build locally
- **Feature flags**: `features.ts` with owner + expiry
- **Observability**: `emitEvent()` to console (Axiom-ready)

---

## Demo Flow

1. **Browse** → animated cards, filter, “Surprise Me”
2. **Add to cart** → toast + pulse badge
3. **Checkout** → mock form
4. **Submit** → confirmation with:
   - Share link
   - Copy JSON
   - Print receipt
   - Voice mode
5. **Paste link** → cart auto-fills
6. **Reset** → do it again

---

## Doctor Scripts

```bash
bin/doctor-cart     # → { "ok": true, "items": 2 }
bin/doctor-orders   # → { "ok": true, "orders": 5 }
```

---

## Smoke Test

```bash
bin/smoke
# → Builds prod, starts preview, curls routes
```

---

## Feature Flags

```ts
// src/config/features.ts
aiVoice: { enabled: true, owner: 'dean', expiresAt: '2026-01-01' }
```

Enforced in CI:

```bash
npm run check:flags
```

---

## Learning Guide

See [`learning-guide.md`](./learning-guide.md) for the full journey:

- CDN → JSX → Vite → TypeScript → Tailwind → MDX → Zustand → React Query

---

## Philosophy

> _“I don’t want magic. I want to see every moving part, be able to turn it off, and still boot the thing.”_

This app is **observable**, **debuggable**, **repeatable**, and **philosophy-compliant**.

---

## Author

**Dean Lofts** ([@loftwah](https://x.com/loftwah))
