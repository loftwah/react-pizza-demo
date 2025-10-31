# Learning Guide – Loftwah React Pizza Shop

This guide walks through the full journey of the pizza shop demo – from the no-build CDN version you first watched all the way to the production-ready Vite + TypeScript app that lives in this repo. Copy it into your notes, tweak it, or jump straight to the parts you want to revisit.

---

## 1. The CDN Starting Point

The video tutorial began with a single HTML file that pulled React from a CDN. No bundler, no JSX, no TypeScript – just raw `React.createElement`.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Pizza Shop</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="src/App.js"></script>
  </body>
</html>
```

```js
const { createElement: h } = React

const menu = [
  { id: 'pepperoni', displayName: 'Pepperoni Classic', price: 14 },
  { id: 'veggie', displayName: 'Veggie Delight', price: 19 },
]

function PizzaCard({ pizza }) {
  return h(
    'div',
    { style: { border: '1px solid gray', padding: '10px' } },
    h('h2', null, pizza.displayName),
    h('p', null, `$${pizza.price.toFixed(2)}`),
  )
}

function App() {
  return h(
    'div',
    null,
    h('h1', null, 'Pizza Menu'),
    menu.map((pizza) => h(PizzaCard, { key: pizza.id, pizza })),
  )
}

ReactDOM.render(h(App), document.getElementById('root'))
```

### Why This Matters

- **No tooling** – open `index.html` in a browser and you’re done.
- **Core React concepts** – components, props, list rendering, keys, and the virtual DOM.
- **See the raw API** – `React.createElement` is what JSX compiles to behind the curtain.
- **Limits** – no modules, no type checking, no hot reloading, and styling is stuck in inline objects. Perfect for foundations, not for production.

---

## 2. Bringing in Vite + JSX + TypeScript

As soon as the app needs structure, JSX, or build-time features, we move to a toolchain. In this repo we scaffolded with the React + TypeScript Vite template:

```bash
npm create vite@latest react-pizza-demo -- --template react-ts
cd react-pizza-demo
npm install
```

Key files:

| File | Purpose |
| --- | --- |
| `index.html` | Still the single HTML entry point, but script tags now point to Vite’s bundle. |
| `src/main.tsx` | Boots React with `createRoot`, wraps the app in `StrictMode`, and imports CSS. |
| `src/App.tsx` | Uses JSX and TypeScript to render the UI. |
| `tsconfig*.json` | Controls TypeScript behaviour – `jsx: react-jsx` tells TS to emit JSX automatically. |
| `vite.config.ts` | Wires up plugins – React, MDX, Tailwind – and exposes dev/build commands. |

### What Changed vs the CDN version

- **Modules & imports** – `import React from 'react'` replaces global CDN variables.
- **JSX** – `<App />` replaces `React.createElement(App)`.
- **TypeScript** – adds static types, IDE completion, and catches mistakes before shipping.
- **Dev server** – `npm run dev` starts an HMR-powered server at `http://localhost:5173`.

---

## 3. Styling with Tailwind CSS

Inline styles get messy fast. Tailwind gives us design tokens at our fingertips via utility classes. This repo uses the official Vite plugin:

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- `tailwind.config.ts` defines where Tailwind scans for class names (`./src/**/*.{ts,tsx,mdx}`) and extends fonts/colours for the brand.
- `src/index.css` switches to `@import 'tailwindcss';` and adds a subtle radial background.
- The Vite config registers `tailwindcss()` so Tailwind runs during dev/build.

> ⚠️ Tailwind 4 dropped the built-in class strategy for dark mode. If you rely on the `dark:` prefix (we do), register a custom variant yourself or the utilities will always be active. We add this once in `src/index.css`:

```css
@custom-variant dark (&:where(.dark &));
```

This tells Tailwind to only apply `dark:*` utilities when an ancestor has `.dark`, matching how our `ThemeProvider` toggles themes.

**Why Tailwind?** Rapid iteration, responsive design baked-in, and the ability to co-locate styles with components. We lean on classes like `rounded-3xl`, `backdrop-blur`, and `tracking-[0.35em]` – handwritten CSS would be slower here.

---

## 4. Routing with React Router

Single-page apps need navigation. `react-router-dom` gives us declarative routes, nested layouts, and `NavLink` for active states.

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

createRoot(...).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
```

`App.tsx` defines the routes:

```tsx
<Routes>
  <Route path="/" element={<MenuPage />} />
  <Route path="/about" element={<About />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

Navigation highlights come from `NavLink` + `clsx`, giving us conditional Tailwind classes per route.

---

## 5. MDX for Content Pages

The About page is authored in Markdown + JSX (MDX), perfect for copy that needs formatting without leaving React.

```bash
npm install @mdx-js/react -D @mdx-js/rollup
```

- `vite.config.ts` registers `mdx()` so `.mdx` files compile into React components.
- `src/mdx.d.ts` provides TypeScript types for MDX imports.
- In `App.tsx` we import the page with `import About from './pages/About.mdx'` and render it like any component.

Result: content writers keep markdown ergonomics, developers keep component power.

---

## 6. Domain Logic, State, and Data Fetching

Real apps separate UI from domain logic. This repo follows that pattern:

| Folder | Highlights |
| --- | --- |
| `src/domain` | Pure TypeScript modules for pizza data, pricing helpers, and filters. |
| `src/hooks` | `useMenu` wraps React Query for menu fetching/caching. |
| `src/stores` | Zustand store drives cart totals, quantities, and actions. |
| `src/components` | Presentation components – `PizzaCard`, `Header`, `Layout`. |
| `src/pages` | Route-level screens (`MenuPage.tsx`, `About.mdx`). |

### React Query (`@tanstack/react-query`)

`src/hooks/useMenu.ts` fetches menu data, seeds it with static initial data, and caches it for five minutes. React Query handles loading/error states and retries.

### Zustand (`zustand`)

`src/stores/cart.ts` manages cart items outside of React context, keeping the component tree light. Actions (`addItem`, `decrementItem`, `clear`) mutate a small store; selectors like `totalPrice()` power the header badge and summary.

### `useEffect` in Context

`src/pages/MenuPage.tsx` demonstrates two practical side-effects:

1. **Open/Close status** – checks the current hour on mount and every minute, updating a banner accordingly (mount + cleanup pattern).
2. **Document title** – updates the page title when the active filter changes (dependency array usage).

Both effects keep rendering pure while synchronising with browser APIs.

### `clsx` for Conditional Classes

We use `clsx` wherever styling depends on state – filter buttons, nav links, cart controls – keeping the JSX tidy and expressive.

---

## 7. App Structure Recap

```
src/
  App.tsx             // Routes + layout
  main.tsx            // Bootstraps React, Router, and QueryClient
  index.css           // Tailwind entry + global background
  components/
    Header.tsx
    Layout.tsx
    PizzaCard.tsx
  domain/
    menu.ts
    pizza.ts
  hooks/
    useMenu.ts
  pages/
    About.mdx
    MenuPage.tsx
  stores/
    cart.ts
  mdx.d.ts
```

`npm run dev` spins up the dev server with hot module replacement, while `npm run build` compiles TypeScript and produces a production bundle in `dist/`.

---

## 8. Experiment Checklist

- Swap menu data in `src/domain/menu.ts` and watch React Query rehydrate without code changes.
- Add a dessert page by creating `Desserts.mdx` and dropping it into the router.
- Persist the cart to `localStorage` via Zustand middleware (`persist`) for a more realistic checkout flow.
- Try a new Tailwind colour palette by editing `tailwind.config.ts`.
- Connect a live API by replacing `fetchMenu` with a `fetch('/api/menu')` call (React Query already covers caching/retries).

---

## 9. Core React APIs Reference

| Function | From | What it does | Where to see it |
| --- | --- | --- | --- |
| `createRoot` | `react-dom/client` | Creates the render root; replaces `ReactDOM.render`. | `src/main.tsx` |
| `StrictMode` | `react` | Highlights unsafe patterns in dev. | `src/main.tsx` |
| `useState` | `react` | Local component state. | `src/components/PizzaCard.tsx` |
| `useEffect` | `react` | Runs side-effects after render. | `src/pages/MenuPage.tsx` |
| `useMemo` | `react` | Memoises derived data. | `src/components/PizzaCard.tsx` |
| `Routes` / `Route` / `NavLink` | `react-router-dom` | Client-side routing. | `src/App.tsx`, `src/components/Header.tsx` |
| `useQuery` | `@tanstack/react-query` | Fetch/caches data with auto states. | `src/hooks/useMenu.ts` |
| `create` | `zustand` | Builds a lightweight global store. | `src/stores/cart.ts` |

Every concept from the CDN demo appears here, just with modern tooling layered on top. Follow the progression, tweak the code, and you’ll cement not only how React works but also why the ecosystem’s tools matter.
