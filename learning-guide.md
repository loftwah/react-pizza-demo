# Loftwah React Pizza Shop: Step-by-Step Build Guide (ELI5 Edition for Beginner Pros)

Hey there! If you're a new professional developer (maybe you got this running with some AI help, but now you want to _really_ understand it), this guide is for you. We'll build the app from scratch, explaining everything like you're 5—but with pro tips to get you up to speed fast. No fluff: What we're adding, why it matters, how it works (with code snippets + simple breakdowns), and what to do next (like "npm install? Build?").

Think of this as your "React Cookbook": Follow along, code it, and you'll know how to turn a blank Vite app into a full pizza shop demo. You'll learn core React, tools, and patterns—enough for real jobs. If something's confusing, pause and Google "React [term]" or ask AI for a quick example.

**Pro Tip**: Open your code editor + terminal. Run commands as we go. If stuck, `npm run dev` and check the browser/console for errors—they tell you what's wrong!

Assumptions:

- You have Node.js (version 24+—we'll check this later). If not, download from nodejs.org.
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
      // "Safety net"—in dev, checks for mistakes (like bad state use)
      <App /> // Runs your App component
    </React.StrictMode>,
  );
  ```

  - Why? This is how React "starts." `createRoot` is new in React 18—faster, supports future features.

- `src/App.tsx`: Your first page (like a blank canvas). Has a counter to test.

  ```tsx
  import { useState } from 'react'; // "Memory" hook—remembers stuff between clicks
  import reactLogo from './assets/react.svg'; // Image import—Vite optimizes it
  import './App.css'; // Styles for this file only

  function App() {
    const [count, setCount] = useState(0); // count starts at 0; setCount changes it + updates screen

    return (
      // What to show: Like HTML, but with {variables}
      <div className="App">
        {' '}
        // className = CSS class (Tailwind later)
        <h1>Vite + React</h1> // Heading
        <button onClick={() => setCount(count + 1)}>
          {' '}
          // Click event—updates count count is {count} // Shows live value
        </button>
      </div>
    );
  }

  export default App; // "Share" this component for imports
  ```

  - Why useState? React "remembers" without globals. Change count → screen updates automatically (re-render).

- `vite.config.ts`: Vite's "recipe."

  ```ts
  import { defineConfig } from 'vite'; // Vite's setup function
  import react from '@vitejs/plugin-react'; // Makes React work (JSX, fast reload)

  export default defineConfig({
    // Your config
    plugins: [react()], // Add React support
  });
  ```

  - Why plugins? Vite is modular—add features like React without bloat.

**Test It**: Browser shows logos + button. Click: Count goes up. Edit `App.tsx` (change h1): Saves + reloads instantly (HMR = hot module replacement—saves time!).

**Pro Tip**: Errors? Check console (F12). TS complains if types wrong (e.g., setCount('string')—boom, error before run).

---

## Step 2: Add Key Packages (The Ingredients)

Like adding spices: These make the app "tasty." Run once.

```bash
npm i react-router-dom @tanstack/react-query zustand clsx lucide-react zod  # Core: routing, data, state, classes, icons, validation
npm i -D tailwindcss postcss autoprefixer @mdx-js/react @mdx-js/rollup vitest playwright @testing-library/react @testing-library/user-event  # Dev: styles, content, tests
npx tailwindcss init -p  # Makes tailwind.config.js + postcss.config.js (styles setup)
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
  "build": "tsc && vite build",  // tsc checks TS, vite bundles for prod
  "preview": "vite preview",  // Test built app locally
  "test": "vitest",  // Run unit tests
  "e2e": "playwright test"  // Run browser tests
}
```

**After Install?** No build yet—just `npm run dev` to see if it starts (should, since no code changes). Packages are now ready—Vite uses them when we import.

**Pro Tip**: `npm outdated` checks for updates. Errors? Delete `node_modules` + `package-lock.json`, then `npm install`.

---

## Step 3: Style with Tailwind (Make It Pretty)

Tailwind = "Lego blocks" for styles: Use classes like "bg-red p-4" instead of CSS files.

Edit `tailwind.config.js` (created by init):

```js
module.exports = {
  content: ['./src/**/*.{ts,tsx,mdx}'], // Tailwind "looks" here for classes to keep (no bloat)
  theme: {
    // Your custom look
    extend: {
      // Add to defaults
      colors: { 'brand-red': '#e53e3e' }, // Pizza theme color—use as text-brand-red
      fontFamily: { display: ['Your Cool Font', 'sans-serif'] }, // Google Fonts later
    },
  },
  plugins: [], // Empty for now
};
```

Replace `src/index.css` (global styles):

```css
@tailwind base;  // Basic resets (fonts, margins zero)
@tailwind components;  // Your custom "recipes" (add later, e.g., @layer components { .btn { ... } })
@tailwind utilities;  // The magic: flex, gap, dark:bg-black, etc.

@custom-variant dark (&:where(.dark &));  // Trick for dark mode—only apply dark: when <html> has .dark class
```

`main.tsx` already imports it.

Test: In `App.tsx`, change `<div className="App">` to `<div className="bg-brand-red p-4 text-white">`. Reload browser: Red background + padding. That's Tailwind!

**How It Works**: Write classes in code—Tailwind builds CSS file on `npm run dev/build`. No more "style={{ background: 'red' }}"—faster, consistent.

**Pro Tip**: Install VSCode "Tailwind CSS IntelliSense" extension—auto-completes classes.

No npm install/build needed here (already did init). Just edit + refresh.

---

## Step 4: Add Routing and Pages (Navigation Basics)

Like adding doors to rooms: Switch "pages" without leaving the app.

`main.tsx` update (wrap App):

```tsx
import { BrowserRouter } from 'react-router-dom'; // "Fake" browser history for single-page app

// Inside render:
<BrowserRouter>
  {' '}
  // Enables links/routes
  <App />
</BrowserRouter>;
```

`App.tsx` (remove counter; add routes):

```tsx
import { Routes, Route } from 'react-router-dom'; // "If URL is X, show Y"

function App() {
  return (
    <Routes>
      {' '}
      // Big switch statement for URLs
      <Route
        path="/"
        element={<div className="p-4">Menu Page (pizzas coming soon!)</div>}
      />{' '}
      // Home
      <Route path="/about" element={<div className="p-4">About Us</div>} /> //
      New "page"
      <Route
        path="*"
        element={<div className="p-4 text-red-500">404 - Page Not Found</div>}
      />{' '}
      // Wildcard for bad URLs
    </Routes>
  );
}
```

Create `src/components/Header.tsx` (shared nav—add to top of App return):

```tsx
import { NavLink } from 'react-router-dom'  // Link with "active" superpowers
import clsx from 'clsx'  // "Mix" classes easily

export const Header = () => (  // Function component—no state yet
  <header className="bg-white p-4 border-b shadow">  // Tailwind: white bg, padding, border
    <nav className="flex gap-4">  // Horizontal links
      <NavLink
        to="/"  // URL to go to
        className={({ isActive }) => clsx(  // clsx: if active, add classes
          'px-4 py-2 rounded',  // Base
          isActive ? 'bg-brand-red text-white' : 'text-brand-red hover:bg-gray-100'  // Active = red bg
        )}
      >
        Menu
      </NavLink>
      <NavLink to="/about" className={...}>About</NavLink>  // Copy pattern
    </nav>
  </header>
)
```

In `App.tsx`, add `<Header />` before <Routes>.

**How It Works**: BrowserRouter "listens" to URL. Route matches path → shows element. NavLink = smart <a> (no reload, active class for highlight).

Test: Browser / → Menu div, red link. Click About: Switches, About link red. Bad URL like /oops → 404.

No install/build—already installed router. Refresh dev server if needed.

**Pro Tip**: For mobile nav (later): Add state for menu open/close.

---

## Step 5: Add Dark Mode (Theme Toggle—Make It Night-Friendly)

Like a light switch for the app.

Create `src/providers/theme-context.ts` (global "share" for theme):

```ts
import { createContext, useContext, useState, useEffect } from 'react'  // Context = "broadcast" to all kids

const ThemeContext = createContext({ theme: 'light' as const, toggleTheme: () => {} })  // "Channel" for theme info

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {  // Wrapper component
  const [theme, setTheme] = useState<'light' | 'dark'>('light')  // State: light or dark

  useEffect(() => {  // Run once on load
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {  // Check user's system setting
      setTheme('dark')  // Auto-dark if they like dark
    }
  }, [])  // Empty [] = run only once

  const toggleTheme = () => {  // Flip switch
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')  // Add/remove 'dark' class on <html>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>  // Broadcast value
      {children}  // Kids get access
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)  // Easy hook to "listen"
```

`main.tsx` update (wrap BrowserRouter):

```tsx
<ThemeProvider>
  <BrowserRouter> ... </BrowserRouter>
</ThemeProvider>
```

`Header.tsx` add button:

```tsx
const { toggleTheme } = useTheme()  // Listen here
<button onClick={toggleTheme} className="ml-auto p-2 bg-gray-200 rounded">Toggle Theme</button>
```

Add to CSS (index.css): Use `dark:bg-black dark:text-white` in components.

**How It Works**: Provider "shares" state. Effect checks system. Toggle updates class—Tailwind sees 'dark' and applies dark: styles.

Test: Click button—app darkens (add `dark:bg-gray-900` to body in App.tsx to see).

No install—React built-in. Refresh dev.

**Pro Tip**: For icons, add <Sun /> or <Moon /> from lucide-react (import { Sun, Moon } from 'lucide-react').

---

## Step 6: Add Toasts (Pop-Up Messages for Feedback)

Like "toast" notifications on your phone—short messages (e.g., "Added to cart!").

Create `src/providers/toast-context.tsx` (similar to theme):

```ts
const ToastContext = createContext({ showToast: () => {} as (toast: { message: string, tone: 'success' | 'info' | 'error' }) => void })

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<{ id: number, message: string, tone: string }[]>([])  // List of toasts

  const showToast = (toast) => {  // Add new
    const id = Date.now()  // Unique ID
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)  // Hide after 3s
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">  // Corner position
        {toasts.map(t => (
          <div key={t.id} className={clsx(  // Style by tone
            'p-4 rounded shadow text-white',
            t.tone === 'success' ? 'bg-green-500' : t.tone === 'error' ? 'bg-red-500' : 'bg-blue-500'
          )}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
```

`main.tsx` wrap (inside ThemeProvider):

```tsx
<ToastProvider>
  <BrowserRouter> ... </BrowserRouter>
</ToastProvider>
```

Use in PizzaCard (later): `showToast({ message: 'Yay!', tone: 'success' })`

**How It Works**: State list; timeout hides. Clsx for colors.

Test: Add button in App to showToast. Click: Pop-up appears/disappears.

---

## Step 7: Fetch Data with React Query (Get Menu from "API")

Like "ordering food"—fetch menu, show loading if slow.

`main.tsx` wrap (outermost):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()  // "Manager" for fetches

<QueryClientProvider client={queryClient}>
  <ThemeProvider> ... </ThemeProvider>
</QueryClientProvider>
```

Create `src/domain/menu.ts` (data "home"):

```ts
export type Pizza = { id: string; displayName: string; prices: Record<PizzaSize, number>; image: string; description: string; ... }  // Shape of pizza (TS safety)

export type PizzaSize = 'small' | 'medium' | 'large'  // Only these sizes—TS yells if wrong

export const sizeLabels = { small: 'Small (10")', ... }  // Human names

export const menu: Pizza[] = [  // Fake data array
  { id: 'pepperoni-classic', displayName: 'Pepperoni Classic', prices: { small: 12, medium: 15, large: 18 }, image: '/pepperoni-classic.jpg', description: 'Classic pepperoni...', toppings: ['pepperoni', 'mozzarella'], ... },
  // Add 10+ more pizzas from XML (copy from public/api/menu.json)
]

export const menuSnapshot = menu  // For fast loads

export const getPizzaById = (id: string) => menu.find(p => p.id === id) || null  // Find or null (safe)

export const fetchMenu = async () => {  // "API" call (mock)
  await new Promise(resolve => setTimeout(resolve, 300))  // Fake delay—like slow network
  return menu  // Return data
}
```

Create `src/hooks/useMenu.ts` (reusable "getter"):

```ts
import { useQuery } from '@tanstack/react-query';

export const useMenu = () =>
  useQuery({
    // "Ask for data"
    queryKey: ['menu'], // Name for cache (same key = share cache)
    queryFn: fetchMenu, // The "doer" function
    initialData: menuSnapshot, // Start with this—no "loading" flash
    staleTime: 5 * 60 * 1000, // Keep fresh 5 mins—no re-fetch
  });
```

**How It Works**: useQuery "asks" + caches. If net slow, shows initialData. Auto retries if error.

Test: In MenuPage (next step), use { data, isLoading }.

---

## Step 8: Build Global State for Cart & Orders (The "Shopping Bag")

Zustand = simple "store" for shared stuff (no big Redux setup).

Create `src/stores/cart.ts`:

```ts
import { create } from 'zustand'  // Make store
import { persist } from 'zustand/middleware'  // Save to localStorage (survives refresh)
import { getPizzaById, priceForConfiguration, composeCartItemKey } from '../domain/pizza'  // Domain helpers

interface CartItem { id: string; pizzaId: string; size: PizzaSize; quantity: number; customization: { removedIngredients: string[]; addedIngredients: { id: string; quantity: number }[] } }  // Item shape

export const useCartStore = create< { items: CartItem[]; addItem: (...) => void; ... } >()(  // Types for safety
  persist(  // Auto-save
    (set, get) => ({  // State + functions
      items: [],  // Empty bag
      addItem: (pizzaId, size, customization = { removedIngredients: [], addedIngredients: [] }) => set(state => {  // Add or +qty
        const pizza = getPizzaById(pizzaId)
        if (!pizza) return state  // Safety
        const id = composeCartItemKey(pizzaId, size, customization)  // Unique ID (pizza-medium-no-olives)
        const existing = state.items.find(i => i.id === id)
        if (existing) return { items: state.items.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i) }  // +1 qty
        return { items: [...state.items, { id, pizzaId, size, quantity: 1, customization }] }  // New item
      }),
      decrementItem: (id) => set(state => {  // -1 or remove
        const item = state.items.find(i => i.id === id)
        if (!item) return state
        if (item.quantity === 1) return { items: state.items.filter(i => i.id !== id) }
        return { items: state.items.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i) }
      }),
      removeItem: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),  // Clear line
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),  // Count all
      totalPrice: () => get().items.reduce((sum, i) => sum + priceForConfiguration(getPizzaById(i.pizzaId)!, i.size, i.customization) * i.quantity, 0),  // Sum prices
      hydrateFromOrder: (order) => set({ items: order.items.map(line => ({ id: `${line.pizzaId}-${line.size}`, pizzaId: line.pizzaId, size: line.size, quantity: line.quantity, customization: line.customization })) }),  // Load from share
      clear: () => set({ items: [] }),  // Empty
    }),
    { name: 'loftwah-pizza-cart' }  // Storage name
  )
)
```

`orders.ts` similar: array, addOrder (slice to max 12), persist.

**How It Works**: create() = store. persist = auto-save. get() = current state. set() = update (immutable—copy arrays).

Test: In console (F12), `import { useCartStore } from './src/stores/cart'; useCartStore.getState().addItem('test', 'medium')` — check .items.

---

## Step 9: Build the Menu Page and Pizza Cards (The Shop Window)

Replace home in App routes with MenuPage.

Create `src/pages/MenuPage.tsx`:

```tsx
import { useMenu } from '../hooks/useMenu'; // Data hook
import PizzaCard from '../components/PizzaCard'; // Per item

export const MenuPage = () => {
  const { data: menu, isLoading } = useMenu(); // Get data; handle loading

  const [isOpen, setIsOpen] = useState(true); // Local for shop hours

  useEffect(() => {
    // Side effect: Check time
    const checkOpen = () => {
      const hour = new Date().getHours(); // Now's hour
      setIsOpen(hour >= 11 && hour < 22); // Open 11am-10pm
    };
    checkOpen(); // Run now
    const interval = setInterval(checkOpen, 60 * 1000); // Every min
    return () => clearInterval(interval); // Cleanup (no leaks)
  }, []); // Run once

  if (isLoading)
    return <div className="p-4 text-center">Loading pizzas...</div>; // Spinner alternative

  return (
    <section className="p-4">
      {' '}
      // Container
      {!isOpen && (
        <div className="mb-4 bg-yellow-200 p-4">
          We're closed! Come back tomorrow.
        </div>
      )}{' '}
      // Banner
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {' '}
        // Responsive: 1 col mobile, 3 desktop
        {menu.map(
          (
            pizza, // Loop + key for efficiency
          ) => (
            <PizzaCard key={pizza.id} pizza={pizza} /> // Pass data
          ),
        )}
      </div>
    </section>
  );
};
```

Create `src/components/PizzaCard.tsx` (the star):

```tsx
import { useState } from 'react'
import { Flame, Leaf } from 'lucide-react'  // Icons
import { useCartStore } from '../stores/cart'  // State
import { useToast } from '../providers/toast-context'  // Feedback
import { priceForConfiguration, sizeLabels, extrasForPizza, ... } from '../domain/pizza'  // Logic

export const PizzaCard = ({ pizza }: { pizza: Pizza }) => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('medium')  // Default size
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([])  // Held toppings
  const [addedIngredients, setAddedIngredients] = useState<Partial<Record<string, number>>>({})  // Extras qty

  const addItem = useCartStore(s => s.addItem)  // Action
  const { showToast } = useToast()

  const unitPrice = priceForConfiguration(pizza, selectedSize, { removedIngredients, addedIngredients })  // Live calc

  const handleAdd = () => {  // Add + notify
    addItem(pizza.id, selectedSize, { removedIngredients, addedIngredients })
    showToast({ message: `Added ${sizeLabels[selectedSize]} ${pizza.displayName}`, tone: 'success' })
  }

  // Customizer logic: Toggle remove, +/ - extras, check conflicts (from domain)

  return (
    <article className="border rounded-3xl overflow-hidden">  // Card box
      <img src={pizza.image} alt={pizza.displayName} className="w-full h-56 object-cover" />  // Picture
      <div className="p-6">
        <h3 className="text-2xl font-bold">{pizza.displayName}</h3>  // Name
        <p className="text-gray-600">{pizza.description}</p>  // Desc
        {pizza.spicy && <Flame className="h-4 w-4 text-red-500" />}  // Icon if spicy
        {/* Size buttons: map ['small', 'medium', 'large'], onClick set */}
        {/* Customizer: Buttons for remove/add, blocked if conflict */}
        <button onClick={handleAdd} className="bg-brand-red text-white p-3 rounded-full w-full">Add for ${unitPrice.toFixed(2)}</button>
      </div>
    </article>
  )
}
```

**How It Works**: Local state for choices; domain for price/conflicts; store for cart; toast for "yay".

Test: Add pizzas to menu array. Browser shows grid. Click add: Toast pops, cart updates (log useCartStore.getState().items in console).

---

## Step 10: Build Checkout (The Cash Register)

Create `src/pages/CheckoutPage.tsx` (add to routes):

```tsx
import { useIsMobile } from '../hooks/useIsMobile'; // Detect screen

export const CheckoutPage = () => {
  const isMobile = useIsMobile(); // True if <480px (media query)
  return isMobile ? <CheckoutPageMobile /> : <CheckoutPageDesktop />; // Pick version
};
```

`useIsMobile.ts`:

```ts
import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 480px)'); // Listen to size
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener); // Cleanup
  }, []);

  return isMobile;
};
```

`CheckoutPageMobile.tsx` (simple form):

```tsx
import { useState } from 'react'
import { useCartStore } from '../stores/cart'
import { useOrderHistory } from '../stores/orders'  // Action addOrder
import z from 'zod'  // Validator
import { OrderService } from '../services/order-service'  // Submitter

const schema = z.object({ customer: z.string().min(1, 'Name needed!'), contact: z.string().min(1), instructions: z.string().optional() })  // Rules

export const CheckoutPageMobile = () => {
  const items = useCartStore(s => s.items)  // Get cart
  const [submittedOrder, setSubmittedOrder] = useState(null)  // After submit
  const orderService = new OrderService()  // New each time

  const handleSubmit = async (e) => {
    e.preventDefault()  // Stop reload
    const formData = new FormData(e.target)  // Get inputs
    const parsed = schema.safeParse({ customer: formData.get('customer'), ... })  // Check rules
    if (!parsed.success) return showToast({ message: parsed.error.issues[0].message, tone: 'error' })

    const result = await orderService.run({ ...parsed.data, items, total: useCartStore.getState().totalPrice() })  // Send
    if (result.ok) {
      setSubmittedOrder(result.value)  // Show confirmation
      useOrderHistory.getState().addOrder(result.value)  // Save history
      useCartStore.getState().clear()  // Empty cart
      showToast({ message: 'Order in!' })
    } else {
      showToast({ message: 'Oops—try again', tone: 'error' })
    }
  }

  if (submittedOrder) return (  // Confirmation screen
    <div>
      <h1>Order #{submittedOrder.id}</h1>
      // List items, total, voice button (SpeechSynthesis), share link (URLSearchParams)
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">  // Inputs
      <input name="customer" placeholder="Your name" className="border p-2 w-full" required />  // Zod checks
      // Contact, instructions
      <button type="submit" className="bg-brand-red text-white p-3 w-full">Submit Order</button>
    </form>
  )
}
```

Desktop version: Wider form + history side panel.

Create `order-service.ts` (mock submit):

```ts
export class OrderService {
  // "Processor"
  async run(input) {
    // Mock steps: validate, "send" to API (fetch /api/order-response.json with delay), save
    const res = await retryWithBackoff(async () => {
      await new Promise((r) => setTimeout(r, 500)); // Fake work
      return { ok: true, value: { id: 'LP-' + Date.now(), ...input } }; // Fake order
    });
    return res; // Result pattern
  }
}
```

**How It Works**: Form submit → validate (Zod) → service (retry) → store/update UI.

Test: Add to cart, go /checkout, submit: Toast + confirmation.

---

## Step 13: Add MDX for Content Pages (Mix Text + Code)

Like a blog in your app.

First, add plugin (npm already installed @mdx-js/\*):
Edit `vite.config.ts`:

```ts
import mdx from '@mdx-js/rollup'; // New import

export default defineConfig({
  plugins: [react(), mdx()], // Add to array—Vite "runs" it for .mdx files
});
```

Create `src/types/mdx.d.ts` (TS support):

```ts
declare module '*.mdx' {
  // Tell TS ".mdx" = component
  const MDXComponent: (props) => JSX.Element;
  export default MDXComponent;
}
```

Create `src/pages/About.mdx`:

```mdx
# About Loftwah Pizza // Markdown heading

We love pizza! // Text

import PizzaCard from '../components/PizzaCard'; // Embed React!

<PizzaCard pizza={{ id: 'example', ... }} />  // Live component
```

Update routes: `<Route path="/about" element={<About />} />` (import About from './pages/About.mdx')

**How to Add Plugin (Footprint + Steps)**:

- Footprint: Adds ~5MB to node_modules (small); builds .mdx to JS.
- Do I npm install again? No—if you already ran npm i @mdx-js/rollup. If new, yes: `npm i -D @mdx-js/rollup`.
- Build again? No—just `npm run dev` restarts with plugin. Test build: `npm run build` (checks for errors).

**How It Works**: MDX = Markdown to JSX. Vite plugin compiles it. Embed components for dynamic content.

Test: /about shows heading + pizza card.

---

## Step 14: Add Analytics, Insights, and Charts (Data Dash)

Create `src/hooks/useAnalytics.ts` (similar to useMenu).

`src/pages/AnalyticsPage.tsx`:

```tsx
const { data } = useAnalytics(); // Metrics
const insights = computeOrderInsights(useOrderHistory.getState().orders); // From orders.ts

// Show cards: <div>Total Orders: {insights.totalOrders}</div>
// Add charts: Create components like HourlyOrdersChart.tsx (use canvas or lib like recharts—npm i recharts if needed)
```

**How It Works**: Query for static; compute pure for dynamic.

---

## Step 15: Add Tests and Debug Tools (Catch Bugs Early)

Update `vite.config.ts` for Vitest:

```ts
test: {
  globals: true,  // Default vars
  environment: 'jsdom',  // Fake browser
  setupFiles: './src/test/setup.ts',  // Run before tests (mocks)
},
```

Create `src/test/setup.ts`: Empty for now.

Add test: `src/components/__tests__/PizzaCard.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'; // Test funcs
import { render, screen } from '@testing-library/react'; // Fake render
import PizzaCard from '../PizzaCard'; // Your component

describe('PizzaCard', () => {
  // Group
  it('shows name', () => {
    // Test case
    render(<PizzaCard pizza={{ displayName: 'Test Pizza' }} />); // "Draw" it
    expect(screen.getByText('Test Pizza')).toBeInTheDocument(); // Check
  });
});
```

Run `npm test`—passes if name shows.

For E2E: `npx playwright init` (adds config). Add specs.

Add doctor scripts: `bin/doctor-cart.ts` (tsx script: setup env, mock store, console.log health).

**How It Works**: Vitest = fast units (logic). Playwright = full browser (clicks/forms).

---

## Step 16: Polish with Features, Utils, and Deploy

- Flags: `src/config/features.ts` (if (import.meta.env.VITE_FEATURE_SHARE === 'true') ...)
- Utils: `shared-utils/list-format.ts` (shorten lists).
- ErrorBoundary: `components/ErrorBoundary.tsx` (class component, componentDidCatch).
- Docker: Add Dockerfile (FROM node:24, npm ci, build, serve).
- CI: `.github/workflows/ci.yml` (checkout, setup node, ci, test, build).

**Final Test**: `npm run build` → dist/ folder. `npm run preview` serves it. Deploy to Vercel/Netlify (push to GitHub, link).

You did it! From blank to pro app. Understand? Code more. Stuck? Console.log everything. Now go build your own twist!
