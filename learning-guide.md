# Loftwah React Pizza Shop: Step-by-Step Build Guide (ELI5 Edition for Beginner Pros)

Hey there! If you're a new professional developer (maybe you got this running with some AI help, but now you want to _really_ understand it), this guide is for you. We'll build the app from scratch, explaining everything like you're 5—but with pro tips to get you up to speed fast. No fluff: What we're adding, why it matters, how it works (with code snippets + simple breakdowns), and what to do next (like "npm install? Build?").

Think of this as your "React Cookbook": Follow along, code it, and you'll know how to turn a blank Vite app into a full pizza shop demo. You'll learn core React, tools, and patterns—enough for real jobs. If something's confusing, pause and Google "React [term]" or ask AI for a quick example.

**Pro Tip**: Open your code editor + terminal. Run commands as we go. If stuck, `npm run dev` and check the browser/console for errors—they tell you what's wrong!

Assumptions:

- You have Node.js Active LTS (>=20—safer for learners; repo prefers 24). Check `node -v`. If wrong, install nvm (nvm-sh.com), then:
  ```bash
  nvm install --lts
  nvm use --lts
  node -v  # Should be 20+
  ```
- You're comfy with basics like "npm install" (adds packages) and editing files.
- Time: 2-4 hours. Test each step!

---

## Step 1: Start with a Blank Vite React + TypeScript App (The Foundation)

This is "zero": A simple app to show Vite works. It's like building a house—first the frame.

In your terminal:

```bash
npm create vite@latest loftwah-pizza -- --template react-ts  # Creates folder with basics
cd loftwah-pizza  # Go inside
npm install  # Downloads React + TS stuff (takes ~1 min)
npm run dev  # Starts server—opens browser to http://localhost:5173 (logos + button)
```

### What's Inside Now? (Simple Breakdown)

Vite is like a super-fast "cook" for your code: Bundles JS/TS, handles images, reloads changes instantly.

Key files (open them!):

- `index.html`: The "front door"—has `<div id="root"></div>` where React puts everything. Script points to `main.tsx`.
- `src/main.tsx`: Starts React. Like turning on the lights.

  ```tsx
  import React from 'react'; // The "brain" for building UIs (components, state)
  import ReactDOM from 'react-dom/client'; // "Puts" React stuff in the browser DOM (HTML)
  import App from './App'; // Your main page (we'll edit this)
  import './index.css'; // Styles (empty now—like a blank outfit)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    // Finds #root div, puts App inside
    <React.StrictMode>
      {' '}
      {/* "Safety net"—in dev, checks for mistakes (like bad state use) */}
      <App /> {/* Runs your App component */}
    </React.StrictMode>,
  );
  ```

  - Why? This is how React "starts." `createRoot` is new in React 18—faster, supports future features.

- `src/App.tsx`: Your first page (like a blank canvas). Has a counter to test.

  ```tsx
  import { useState } from 'react';  // "Memory" hook—remembers stuff between clicks
  import reactLogo from './assets/react.svg';  // Image import—Vite optimizes it
  import viteLogo from '/vite.svg';  // Public asset (no src/ prefix)
  import './App.css';  // Styles for this file only

  function App() {
    const [count, setCount] = useState(0);  // count starts at 0; setCount changes it + updates screen

    return (  // What to show: Like HTML, but with {variables}
      <>
        <div>  {/* Fragment: group without extra DOM */}
          <a href="https://vitejs.dev" target="_blank" rel="noreferrer">  {/* Links: standard HTML; rel for safety */}
            <img src={viteLogo} className="logo" alt="Vite logo" />  {/* Dynamic src + class; alt for a11y (screen readers) */}
          </a>
          {/* Similar for React logo */}
        </div>
        <h1>Vite + React</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>  {/* Click event—arrow fn updates state */}
            count is {count}  {/* Shows live value */}
          </button>
          <p>Edit <code>src/App.tsx</code> and save to test HMR</p>  {/* HMR: hot module reload (fast updates) */}
        </div>
      </>,
    );
  }

  export default App;  // "Share" this component for imports
  ```

  - Why useState? React "remembers" without globals. Change count → screen updates automatically (re-render).

- `vite.config.ts`: Vite's "recipe."

  ```ts
  import { defineConfig } from 'vite'; // Vite's setup function
  import react from '@vitejs/plugin-react'; // Makes React work (JSX, fast reload)

  export default defineConfig({
    plugins: [react()], // Add React support
  });
  ```

  - Why plugins? Vite is modular—add features like React without bloat.

**Test It**: Browser shows logos + button. Click: Count goes up. Edit `App.tsx` (change h1): Saves + reloads instantly (HMR = hot module replacement—saves time!).

**Pro Tip**: Errors? Check console (F12). TS complains if types wrong (e.g., setCount('string')—boom, error before run). For a11y (accessibility): Always add alt to imgs, aria-label to buttons if no text.

---

## Step 2: Add Key Packages (The Ingredients)

Like adding spices: These make the app "tasty." Run once.

```bash
npm i react-router-dom @tanstack/react-query zustand clsx lucide-react zod  # Core: routing, data, state, classes, icons, validation
npm i -D tailwindcss postcss autoprefixer @mdx-js/react @mdx-js/rollup vitest playwright @testing-library/react @testing-library/user-event  # Dev: styles, content, tests
```

- **What Each Does (ELI5)**:
  - react-router-dom: Switches pages without reload (like tabs in app).
  - @tanstack/react-query: Gets data from "API" (mock for us) + remembers it.
  - zustand: "Box" for shared info (cart items—everyone can see/change).
  - clsx: "If this, use that class" (easy conditional styles).
  - lucide-react: Pretty icons (cart, sun/moon).
  - zod: "Check if form is good" (no bad data).
  - Dev ones: Tailwind (quick styles), MDX (mix text + code), Vitest/Playwright (tests), Testing Library (click/test like user).

Update `package.json` scripts (edit file):

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "typecheck": "tsc --noEmit",  /* Separate TS check—fast builds, catch types early */
  "preview": "vite preview",
  "test": "vitest",
  "e2e": "playwright test"
}
```

**After Install?** Run `npm run typecheck` (checks TS—no errors yet). Then `npm run dev` to see if it starts (should, no code changes). Packages are ready—Vite uses them when imported.

**Pro Tip**: `npm outdated` checks updates. Errors? Delete `node_modules` + `package-lock.json`, `npm install`.

---

## Step 2.5: Add ESLint + Prettier (Code Quality & Style)

Before styling, let’s make sure our code stays clean and consistent.
ESLint catches mistakes; Prettier keeps formatting identical for everyone.

### Install

```bash
npm i -D eslint prettier eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-tailwindcss eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### Create `.eslintrc.cjs`

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:tailwindcss/recommended',
    'prettier',
  ],
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'tailwindcss',
  ],
  settings: {
    react: { version: 'detect' },
    tailwindcss: { callees: ['classnames', 'clsx'] },
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Vite handles React globally
    'tailwindcss/no-custom-classname': 'off', // Allow custom tokens/variables
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
```

### Create `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Update `package.json` scripts

```json
"lint": "eslint \"src/**/*.{ts,tsx}\" --fix",
"format": "prettier --write \"src/**/*.{ts,tsx,css,mdx,md,json}\""
```

### Test

```bash
npm run lint
npm run format
```

If you use VS Code, install the **ESLint** and **Prettier** extensions and enable _Format on Save_ — your codebase will stay consistent automatically.

---

## Step 3: Style with Tailwind v4 (Make It Pretty)

Tailwind = "Lego blocks" for styles: Use classes like "bg-red p-4" instead of CSS files. We're using v4 (latest as of Nov 2025—faster, no config file needed for simple apps).

`src/index.css` (replace initial—v4 style):

```css
@import 'tailwindcss'; /* Imports v4 core—no base/components/utilities needed */

@theme {
  /* Custom colors/fonts—v4 way */
  --color-brand-red: #e53e3e; /* Use as bg-[--color-brand-red] */
  --font-display:
    'Inter', ui-sans-serif, system-ui, sans-serif; /* Use as font-[--font-display] */
}

html {
  font-family: var(--font-display);
} /* Global font */
```

`main.tsx` already imports it.

Test: In `App.tsx`, change `<div className="App">` to `<div className="bg-[--color-brand-red] p-4 text-white font-[--font-display]">`. Reload: Red background + padding. That's Tailwind!

**How It Works**: Write classes in code—Tailwind builds CSS on `npm run dev/build`. `dark:` prefix for themes (e.g., dark:bg-black). v4 uses CSS vars for customs—no big config.

**Pro Tip**: Install VSCode "Tailwind CSS IntelliSense" extension—auto-completes. For dark: Add .dark to <html> (next step).

No extra npm/build—v4 is ready. Refresh dev.

---

## Step 4: Add Routing and Pages (Navigation Basics)

Like adding doors to rooms: Switch "pages" without leaving the app.

`main.tsx` update (wrap App):

```tsx
import { BrowserRouter } from 'react-router-dom'; // "Fake" browser history for single-page app

// Inside render:
<BrowserRouter>
  {' '}
  {/* Enables links/routes */}
  <App />
</BrowserRouter>;
```

`App.tsx` (remove counter; add routes—complete imports):

```tsx
import { Routes, Route } from 'react-router-dom'; // "If URL is X, show Y"

function App() {
  return (
    <>
      <Routes>
        {' '}
        {/* Big switch statement for URLs */}
        <Route
          path="/"
          element={<div className="p-4">Menu Page (pizzas coming soon!)</div>}
        />{' '}
        {/* Home */}
        <Route
          path="/about"
          element={<div className="p-4">About Us</div>}
        />{' '}
        {/* New "page" */}
        <Route
          path="*"
          element={
            <div className="p-4 text-[--color-brand-red]">
              404 - Page Not Found
            </div>
          }
        />{' '}
        {/* Wildcard for bad URLs */}
      </Routes>
    </>
  );
}
```

Create `src/components/Header.tsx` (shared nav—add to top of App return):

```tsx
import { NavLink } from 'react-router-dom'; // Link with "active" superpowers
import clsx from 'clsx'; // "Mix" classes easily

export const Header = () => (
  // Function component—no state yet
  <header className="border-b bg-white p-4 shadow">
    {' '}
    {/* Tailwind: white bg, padding, border */}
    <nav className="flex gap-4">
      {' '}
      {/* Horizontal links */}
      <NavLink
        to="/" // URL to go to
        className={({ isActive }) =>
          clsx(
            // clsx: if active, add classes
            'rounded px-4 py-2', // Base
            isActive
              ? 'bg-[--color-brand-red] text-white'
              : 'text-[--color-brand-red] hover:bg-gray-100', // Active = red bg
          )
        }
      >
        Menu
      </NavLink>
      <NavLink
        to="/about"
        className={({ isActive }) =>
          clsx(
            'rounded px-4 py-2',
            isActive
              ? 'bg-[--color-brand-red] text-white'
              : 'text-[--color-brand-red] hover:bg-gray-100',
          )
        }
      >
        About
      </NavLink>{' '}
      {/* Copy pattern */}
    </nav>
  </header>
);
```

In `App.tsx`, add `<Header />` before <Routes>.

**How It Works**: BrowserRouter "listens" to URL. Route matches path → shows element. NavLink = smart <a> (no reload, active class for highlight).

Test: Browser / → Menu div, red link. Click About: Switches, About link red. Bad URL like /oops → 404.

No install/build—router installed in Step 2. Refresh dev.

**Pro Tip**: For a11y: Add aria-current="page" to active NavLink if needed (e.g., className=... aria-current={isActive ? 'page' : undefined}).

---

## Step 5: Add Dark Mode (Theme Toggle—Make It Night-Friendly)

Like a light switch for the app.

Create `src/providers/theme-context.tsx` (global "share" for theme—complete):

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type Theme = 'light' | 'dark';
type Ctx = { theme: Theme; toggleTheme: () => void };
const ThemeContext = createContext<Ctx>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const initial = prefersDark ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
```

`main.tsx` update (wrap BrowserRouter):

```tsx
<ThemeProvider>
  <BrowserRouter> ... </BrowserRouter>
</ThemeProvider>
```

`Header.tsx` add button (with icon for a11y):

```tsx
import { Sun, Moon } from 'lucide-react'; // Icons
const { theme, toggleTheme } = useTheme(); // Listen here
<button
  onClick={toggleTheme}
  className="ml-auto rounded bg-gray-200 p-2"
  aria-label="Toggle theme"
>
  {' '}
  {/* aria-label for screen readers */}
  {theme === 'dark' ? (
    <Moon className="h-5 w-5" />
  ) : (
    <Sun className="h-5 w-5" />
  )}
</button>;
```

Add to index.css: Use dark: (e.g., dark:bg-[hsl(222,47%,11%)]).

**How It Works**: Provider "shares" state. Effect checks system. Toggle updates class—Tailwind sees 'dark' and applies dark: styles.

Test: Click button—app darkens.

No install—React built-in. Refresh dev.

**Pro Tip**: For a11y: Test with screen reader (VoiceOver/ChromeVox)—aria-label helps.

---

## Step 6: Add Toasts (Pop-Up Messages for Feedback)

Like "toast" notifications on your phone—short messages (e.g., "Added to cart!").

Create `src/providers/toast-context.tsx` (complete):

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import clsx from 'clsx';

type Toast = {
  message: string;
  tone: 'success' | 'info' | 'error';
  id: number;
};
const ToastContext = createContext({
  showToast: (toast: Omit<Toast, 'id'>) => {},
});

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]); // List of toasts

  const showToast = (toast: Omit<Toast, 'id'>) => {
    // Add new
    const id = Date.now(); // Unique ID
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000,
    ); // Hide after 3s
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2" aria-live="polite">
        {' '}
        {/* aria-live for a11y (reads new toasts) */}
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              // Style by tone
              'rounded p-4 text-white shadow',
              t.tone === 'success'
                ? 'bg-green-500'
                : t.tone === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
```

`main.tsx` wrap (inside ThemeProvider):

```tsx
<ToastProvider>
  <BrowserRouter> ... </BrowserRouter>
</ToastProvider>
```

Use in PizzaCard (later): `showToast({ message: 'Yay!', tone: 'success' })`

**How It Works**: State list; timeout hides. Clsx for colors. aria-live = screen readers announce.

Test: Add button in App to showToast. Click: Pop-up appears/disappears.

---

## Step 7: Fetch Data with React Query (Get Menu from "API")

Like "ordering food"—fetch menu, show loading if slow.

`main.tsx` wrap (outermost—use AppProviders):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient(); // "Manager" for fetches

function AppProviders({ children }: { children: ReactNode }) {
  // Wrapper to reduce nesting
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// In render:
<AppProviders>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</AppProviders>;
```

Create `src/domain/menu.ts` (data "home"—complete):

```ts
export type PizzaSize = 'small' | 'medium' | 'large'; // Only these—TS safety

export type Pizza = {
  id: string;
  displayName: string;
  prices: Record<PizzaSize, number>;
  image: string;
  description: string;
  toppings: string[];
  vegetarian: boolean;
  vegan: boolean;
  spicy: boolean;
  category: 'savoury' | 'dessert' | 'drink';
  allowCustomization?: boolean;
  sizeLabelsOverride?: Partial<Record<PizzaSize, string>>;
}; // Full shape

export const sizeLabels: Record<PizzaSize, string> = {
  small: 'Small (10")',
  medium: 'Medium (12")',
  large: 'Large (14")',
}; // Defaults

export const menu: Pizza[] = [
  // Fake data (copy from XML public/api/menu.json)
  {
    id: 'pepperoni-classic',
    displayName: 'Pepperoni Classic',
    prices: { small: 12, medium: 15, large: 18 },
    image: '/pepperoni-classic.jpg',
    description: 'Classic pepperoni...',
    toppings: ['pepperoni', 'mozzarella'],
    vegetarian: false,
    vegan: false,
    spicy: false,
    category: 'savoury',
  },
  // Add all from XML
];

export const menuSnapshot = menu; // For fast loads

export const getPizzaById = (id: string): Pizza | null =>
  menu.find((p) => p.id === id) || null; // Find or null

export const fetchMenu = async (): Promise<Pizza[]> => {
  // "API" (mock)
  await new Promise((resolve) => setTimeout(resolve, 300)); // Fake delay
  return menu;
};
```

Create `src/hooks/useMenu.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { menuSnapshot } from '../domain/menu';

export const useMenu = () =>
  useQuery({
    queryKey: ['menu'], // Unique cache key
    queryFn: fetchMenu, // Async fetcher
    initialData: menuSnapshot, // No loading flash
    staleTime: 5 * 60 * 1000, // Cache fresh for 5min
  });
```

**How It Works**: useQuery "asks" + caches. If net slow, shows initialData. Auto retries if error.

Test: In MenuPage (next), use { data, isLoading }.

---

## Step 8: Build Global State for Cart & Orders (The "Shopping Bag")

Zustand = simple "store" for shared stuff (no big Redux setup).

Create `src/stores/cart.ts` (complete):

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // Save to localStorage
import type { PizzaSize, Pizza } from '../domain/pizza'; // Types
import {
  getPizzaById,
  priceForConfiguration,
  composeCartItemKey,
  normalizeCustomization,
} from '../domain/pizza'; // Helpers

type Customization = {
  removedIngredients: string[];
  addedIngredients: { id: string; quantity: number }[];
};

interface CartItem {
  id: string;
  pizzaId: string;
  size: PizzaSize;
  quantity: number;
  customization: Customization;
}

interface CartState {
  items: CartItem[];
  addItem: (
    pizzaId: string,
    size: PizzaSize,
    customization?: Customization,
  ) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  totalItems: () => number;
  totalPrice: () => number;
  hydrateFromOrder: (order: OrderRecord) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (
        pizzaId,
        size,
        cust = { removedIngredients: [], addedIngredients: [] },
      ) =>
        set((state) => {
          const pizza = getPizzaById(pizzaId);
          if (!pizza) return state;
          const customization = normalizeCustomization(cust);
          const id = composeCartItemKey(pizzaId, size, customization);
          const existing = state.items.find((i) => i.id === id);
          if (existing)
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          return {
            items: [
              ...state.items,
              { id, pizzaId, size, quantity: 1, customization },
            ],
          };
        }),
      decrementItem: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return state;
          if (item.quantity === 1)
            return { items: state.items.filter((i) => i.id !== id) };
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity: i.quantity - 1 } : i,
            ),
          };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce(
          (sum, i) =>
            sum +
            priceForConfiguration(
              getPizzaById(i.pizzaId)!,
              i.size,
              i.customization,
            ) *
              i.quantity,
          0,
        ),
      hydrateFromOrder: (order) =>
        set({
          items: order.items.map((line) => ({
            id: composeCartItemKey(line.pizzaId, line.size, line.customization),
            pizzaId: line.pizzaId,
            size: line.size,
            quantity: line.quantity,
            customization: line.customization,
          })),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: 'loftwah-pizza-cart' },
  ),
);
```

`orders.ts` similar (define OrderRecord, addOrder, persist).

**How It Works**: create() = store. persist = auto-save. get() = current. set() = update (copy arrays).

Test: In console, import and addItem—check .items.

---

## Step 9: Build the Menu Page and Pizza Cards (The Shop Window)

Replace home in App routes with MenuPage.

Create `src/pages/MenuPage.tsx` (complete):

```tsx
import { useEffect, useState } from 'react';
import { useMenu } from '../hooks/useMenu';
import PizzaCard from '../components/PizzaCard';

export const MenuPage = () => {
  const { data: menu, isLoading } = useMenu();

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const checkOpen = () => {
      const hour = new Date().getHours();
      setIsOpen(hour >= 11 && hour < 22);
    };
    checkOpen();
    const interval = setInterval(checkOpen, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading)
    return <div className="p-4 text-center">Loading pizzas...</div>;

  return (
    <section className="p-4">
      {!isOpen && (
        <div className="mb-4 bg-yellow-200 p-4">
          We're closed! Come back tomorrow.
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {menu.map((pizza) => (
          <PizzaCard key={pizza.id} pizza={pizza} />
        ))}
      </div>
    </section>
  );
};
```

Create `src/components/PizzaCard.tsx` (complete minimal):

```tsx
import { useState } from 'react';
import { Flame, Leaf, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../stores/cart';
import { useToast } from '../providers/toast-context';
import {
  priceForConfiguration,
  sizeLabels,
  extrasForPizza,
  hasCustomizations,
  formatCurrency,
} from '../domain/pizza';
import type { Pizza, PizzaSize } from '../domain/pizza';

export const PizzaCard = ({ pizza }: { pizza: Pizza }) => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('medium');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedIngredients, setAddedIngredients] = useState<
    Partial<Record<string, number>>
  >({});

  const addItem = useCartStore((s) => s.addItem);
  const { showToast } = useToast();

  const currentCustomization = {
    removedIngredients,
    addedIngredients: Object.entries(addedIngredients).map(
      ([id, quantity]) => ({ id, quantity: quantity ?? 0 }),
    ),
  };
  const unitPrice = priceForConfiguration(
    pizza,
    selectedSize,
    currentCustomization,
  );

  const handleAdd = () => {
    addItem(pizza.id, selectedSize, currentCustomization);
    showToast({
      message: `Added ${sizeLabels[selectedSize]} ${pizza.displayName}`,
      tone: 'success',
    });
  };

  return (
    <article className="overflow-hidden rounded-3xl border">
      <img
        src={pizza.image}
        alt={pizza.displayName}
        className="h-56 w-full object-cover"
      />
      <div className="p-6">
        <h3 className="text-2xl font-bold">{pizza.displayName}</h3>
        <p className="text-gray-600">{pizza.description}</p>
        {pizza.spicy && (
          <Flame className="h-4 w-4 text-red-500" aria-label="Spicy" />
        )}
        {/* Size buttons, customizer toggles */}
        <button
          onClick={handleAdd}
          className="w-full rounded-full bg-[--color-brand-red] p-3 text-white"
          aria-label={`Add ${pizza.displayName} to cart`}
        >
          Add for {formatCurrency(unitPrice)}
        </button>
      </div>
    </article>
  );
};
```

**How It Works**: Local state for choices; domain for price/conflicts; store for cart; toast for "yay". a11y: aria-label on buttons.

Test: Add pizzas to menu. Browser shows grid. Click add: Toast pops, cart updates.

---

## Step 10: Build Checkout (The Cash Register)

Create `src/pages/CheckoutPage.tsx` (add to routes):

```tsx
import { useIsMobile } from '../hooks/useIsMobile';

export const CheckoutPage = () => {
  const isMobile = useIsMobile();
  return isMobile ? <CheckoutPageMobile /> : <CheckoutPageDesktop />;
};
```

`useIsMobile.ts` (complete):

```ts
import { useEffect, useState } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 480px)');
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isMobile;
};
```

`CheckoutPageMobile.tsx` (snippet):

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Copy,
  Minus,
  Plus,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import z from 'zod';
import { useCartStore } from '../stores/cart';
import { useToast } from '../providers/toast-context';
import { useOrderHistory } from '../stores/orders';
import { OrderService } from '../services/order-service';
import { formatCurrency } from '../domain/pizza';

const schema = z.object({
  customer: z.string().trim().min(1, 'Name is required.'),
  contact: z.string().trim().min(1, 'Contact details are required.'),
  instructions: z.string().trim().max(500).optional(),
});

export const CheckoutPageMobile = () => {
  const items = useCartStore((s) => s.items);
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const orderService = useMemo(() => new OrderService(), []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const parsed = schema.safeParse({
      customer: formData.get('customer') as string,
      contact: formData.get('contact') as string,
      instructions: formData.get('instructions') as string,
    });
    if (!parsed.success)
      return showToast({
        message: parsed.error.issues[0].message,
        tone: 'error',
      });
    setIsProcessing(true);
    const result = await orderService.run({
      ...parsed.data,
      cartDetails: items,
      cartTotal: useCartStore.getState().totalPrice(),
    });
    setIsProcessing(false);
    if (result.ok) {
      // Handle success, add to history, clear cart
    } else {
      showToast({ message: result.error?.message ?? 'Error', tone: 'error' });
    }
  };

  return <form onSubmit={handleSubmit}>{/* Inputs + button */}</form>;
};
```

Desktop similar but wider.

`order-service.ts`:

```ts
import { retryWithBackoff } from '../shared-utils/retry-with-backoff';

export class OrderService {
  async run(input) {
    // Steps with describe, fn; use retryWithBackoff
    // Return Result
  }
}
```

**How It Works**: Form → Zod check → service retry → store/update. a11y: required on inputs.

Test: Submit form.

---

## Step 11: Add MDX for Content Pages (Mix Text + Code)

First, edit `vite.config.ts` (add plugin—no extra npm if Step 2 done):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';

export default defineConfig({
  plugins: [mdx(), react()], // Order: mdx before react
});
```

- **Footprint**: Adds MDX compile (small overhead); .mdx files become components.
- Do I npm install again? No—if Step 2 done. If missing: `npm i -D @mdx-js/rollup`.
- Build again? No—`npm run dev` reloads with plugin. Test full: `npm run build` (creates dist/).

Create `src/mdx.d.ts` (TS for MDX):

```ts
declare module '*.mdx' {
  import { ComponentType } from 'react';
  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}
```

Create `src/pages/About.mdx`:

```mdx
# About Loftwah Pizza

We love pizza!

import PizzaCard from '../components/PizzaCard';

<PizzaCard
  pizza={{
    id: 'example',
    displayName: 'Example',
    prices: { small: 10, medium: 12, large: 14 },
    image: '',
    description: '',
    toppings: [],
    vegetarian: true,
    vegan: true,
    spicy: false,
    category: 'savoury',
  }}
/>
```

Update routes: import About from './pages/About.mdx'; <Route path="/about" element={<About />} />

**How It Works**: MDX = Markdown to JSX. Plugin compiles. Embed components.

Test: /about shows + card.

---

## Step 12: Add Analytics, Insights, and Charts (Data Dash)

Create `useAnalytics.ts` (like useMenu).

`AnalyticsPage.tsx` (add to routes):

```tsx
import { useAnalytics } from '../hooks/useAnalytics';
import { useOrderInsights } from '../hooks/useOrderInsights';
import { useOrderHistory } from '../stores/orders';

export const AnalyticsPage = () => {
  const { data: metrics } = useAnalytics();
  const insights = useOrderInsights(useOrderHistory.getState().orders);

  return (
    <div>
      <h1>Analytics</h1>
      <p>Total Orders: {insights.summary.totalOrders}</p>
      {/* Charts: Add <ChannelMixChart data={metrics.channelMix} /> */}
    </div>
  );
};
```

`useOrderInsights.ts`:

```ts
import { OrderRecord } from '../stores/orders';

export const computeOrderInsights = (orders: OrderRecord[]) => {
  // Pure calcs: totals, revenue, etc.
  return {
    summary: {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    },
  };
};
```

**How It Works**: Query for metrics; compute from store.

---

## Step 13: Add Tests and Debug Tools (Catch Bugs Early)

Update `vite.config.ts`:

```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
},
```

Create `setup.ts`: // Empty or add mocks.

Add test: `PizzaCard.test.tsx` (as in feedback).

For Playwright: `npx playwright install --with-deps` (fetches browsers). Run `npm run e2e`.

Add doctors: `bin/doctor-cart.ts` (as in repo).

**How It Works**: Vitest units; Playwright browser.

---

## Step 14: Add Error Boundary (Safety Net for Crashes)

Create `ErrorBoundary.tsx`:

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log(error, info);
  }

  render() {
    return this.state.hasError ? (
      <div>Something went wrong. Reload?</div>
    ) : (
      this.props.children
    );
  }
}

export default ErrorBoundary;
```

Wrap in App: <ErrorBoundary><Routes>...</ErrorBoundary>

**How It Works**: Catches render errors, shows fallback.

---

## Step 15: Polish with Features, Utils, and Deploy

- Flags: `features.ts` (import.meta.env.VITE_FEATURE_X === 'true').
- Utils: `list-format.ts` etc.
- Deploy: Push to GitHub; use Vercel (auto-builds) or Netlify. For GitHub Pages: Add base: '/' in vite.config.ts, npm i -D gh-pages, script "deploy": "gh-pages -d dist".

**Final Test**: `npm run typecheck` (TS ok?); `npm run build` → dist/. `npm run preview` serves.

You did it! From blank to pro. Understand? Code more. Stuck? Console.log. Now build your twist!
