import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MenuPage } from './pages/MenuPage';
import { CheckoutPage } from './pages/CheckoutPage';
import About from './pages/About.mdx';

const NotFound = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
    <h1 className="font-display text-5xl text-slate-900 dark:text-white">
      404
    </h1>
    <p className="max-w-md text-sm text-slate-600 dark:text-white/70">
      We tossed that page into the oven and it never came back. Head to the menu
      for something tastier.
    </p>
  </div>
);

const MenuPageErrorFallback = ({ error }: { error: Error }) => (
  <div className="border-brand-500/40 bg-brand-500/10 text-brand-700 dark:border-brand-200/30 dark:bg-brand-500/20 dark:text-brand-100 mx-auto w-full max-w-2xl rounded-3xl border p-8 text-center text-sm">
    <h2 className="font-display text-brand-700 dark:text-brand-100 text-2xl">
      The menu is taking a break
    </h2>
    <p className="text-brand-600 dark:text-brand-100/80 mt-3">
      Something unexpected happened while loading the page. Try refreshing to
      bring the ovens back online.
    </p>
    <p className="text-brand-500/80 dark:text-brand-100/60 mt-4 text-xs tracking-[0.3em] uppercase">
      {error.message}
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="bg-brand-500 hover:bg-brand-400 focus-visible:ring-brand-200 dark:focus-visible:ring-brand-400 mt-6 inline-flex items-center justify-center rounded-full px-6 py-2 text-xs font-semibold tracking-[0.3em] text-white uppercase transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950"
    >
      Refresh Menu
    </button>
  </div>
);

const App = () => (
  <Layout>
    <Routes>
      <Route
        path="/"
        element={
          <ErrorBoundary
            fallback={(error) => <MenuPageErrorFallback error={error} />}
          >
            <MenuPage />
          </ErrorBoundary>
        }
      />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
);

export default App;
