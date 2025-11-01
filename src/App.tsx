import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MenuPage } from './pages/MenuPage';
import { CheckoutPage } from './pages/CheckoutPage';
import About from './pages/About.mdx';
import AnalyticsPage from './pages/AnalyticsPage';
import { isFeatureEnabled } from './config/features';

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
  <div className="mx-auto w-full max-w-2xl rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-center text-sm text-red-700 dark:border-red-200/30 dark:bg-red-500/20 dark:text-red-100">
    <h2 className="font-display text-2xl text-red-700 dark:text-red-100">
      The menu is taking a break
    </h2>
    <p className="mt-3 text-red-600 dark:text-red-100/80">
      Something unexpected happened while loading the page. Try refreshing to
      bring the ovens back online.
    </p>
    <p className="mt-4 text-xs tracking-[0.3em] text-red-500/80 uppercase dark:text-red-100/60">
      {error.message}
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2 text-xs font-semibold tracking-[0.3em] text-white uppercase transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
    >
      Refresh Menu
    </button>
  </div>
);

const CheckoutPageErrorFallback = ({ error }: { error: Error }) => (
  <div className="mx-auto w-full max-w-2xl rounded-3xl border border-red-500/40 bg-red-500/10 p-8 text-center text-sm text-red-700 dark:border-red-200/30 dark:bg-red-500/20 dark:text-red-100">
    <h2 className="font-display text-2xl text-red-700 dark:text-red-100">
      Checkout hit a snag
    </h2>
    <p className="mt-3 text-red-600 dark:text-red-100/80">
      We couldn&apos;t finish staging your mock order. Refresh the page or head
      back to the menu to try again.
    </p>
    <p className="mt-4 text-xs tracking-[0.3em] text-red-500/80 uppercase dark:text-red-100/60">
      {error.message}
    </p>
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2 text-xs font-semibold tracking-[0.3em] text-white uppercase transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
    >
      Retry Checkout
    </button>
  </div>
);

const analyticsEnabled = isFeatureEnabled('analyticsDashboard');

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
      <Route
        path="/checkout"
        element={
          <ErrorBoundary
            fallback={(error) => <CheckoutPageErrorFallback error={error} />}
          >
            <CheckoutPage />
          </ErrorBoundary>
        }
      />
      {analyticsEnabled && (
        <Route path="/analytics" element={<AnalyticsPage />} />
      )}
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
);

export default App;

if (import.meta.env.DEV) {
  Object.defineProperty(App, 'displayName', {
    value: 'Station.Terminal',
  });
}
