import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Moon, ShoppingCart, SunMedium, X } from 'lucide-react';
import clsx from 'clsx';
import { useCartStore } from '../stores/cart';
import { useTheme } from '../providers/theme-context';
import { formatCurrency } from '../domain/pizza';
import { isFeatureEnabled } from '../config/features';
import { getBaseUrl } from '../shared-utils/base-url';

export const Header = () => {
  const totalItems = useCartStore((state) => state.totalItems());
  const totalPrice = useCartStore((state) => state.totalPrice());
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const pizzaLabel = totalItems === 1 ? 'pizza' : 'pizzas';
  const [badgePulse, setBadgePulse] = useState(false);
  const [cartAnnouncement, setCartAnnouncement] = useState('');
  const isFirstRender = useRef(true);
  const announcementTimer = useRef<number | null>(null);
  const analyticsEnabled = isFeatureEnabled('analyticsDashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (totalItems === 0) return;
    const prefersReducedMotion =
      'matchMedia' in window &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const animationFrameId = window.requestAnimationFrame(() => {
      setBadgePulse(true);
    });
    const timeoutId = window.setTimeout(() => setBadgePulse(false), 520);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [totalItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const totalMessage =
      totalItems > 0
        ? `Cart updated. ${totalItems} ${pizzaLabel} in cart. Total ${formatCurrency(
            totalPrice,
          )}.`
        : 'Cart cleared.';

    const commitId = window.setTimeout(() => {
      setCartAnnouncement(totalMessage);
    });

    if (announcementTimer.current !== null) {
      window.clearTimeout(announcementTimer.current);
      announcementTimer.current = null;
    }
    announcementTimer.current = window.setTimeout(() => {
      setCartAnnouncement('');
      announcementTimer.current = null;
    }, 2000);

    return () => {
      window.clearTimeout(commitId);
      if (announcementTimer.current !== null) {
        window.clearTimeout(announcementTimer.current);
        announcementTimer.current = null;
      }
    };
  }, [pizzaLabel, totalItems, totalPrice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frameId = window.requestAnimationFrame(() => {
      setIsMobileMenuOpen(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  return (
    <header className="print-hidden sticky top-0 z-20 border-b border-stone-200/70 bg-white/80 backdrop-blur transition-colors duration-300 dark:border-white/15 dark:bg-neutral-900/80">
      {cartAnnouncement && (
        <span className="sr-only" aria-live="polite" role="status">
          {cartAnnouncement}
        </span>
      )}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-6 py-4 sm:gap-6 md:grid-cols-[auto_1fr_auto]">
        <NavLink
          to="/"
          className="order-1 flex items-center gap-3 justify-self-center md:justify-self-start"
        >
          <img
            src={`${getBaseUrl()}loftwahs-pizza.jpg`}
            alt="Loftwah Pizza logo"
            width={40}
            height={40}
            className="h-10 w-auto rounded-full border border-stone-200/70 bg-white p-1 transition-colors dark:border-white/20 dark:bg-white/15"
          />
          <span className="font-display text-lg font-semibold tracking-[0.35em] text-slate-900 uppercase transition-colors dark:text-white">
            Loftwah Pizza
          </span>
        </NavLink>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="primary-navigation"
          className="order-2 flex w-full items-center justify-between rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-xs font-semibold tracking-[0.25em] text-slate-700 uppercase transition hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none sm:hidden dark:border-white/20 dark:bg-white/10 dark:text-white/85 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
        >
          <span>Navigation</span>
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <nav
          id="primary-navigation"
          aria-label="Primary"
          className={clsx(
            'order-3 w-full flex-col gap-3 text-sm font-medium text-slate-600 transition-colors sm:order-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-3 dark:text-white/85',
            isMobileMenuOpen ? 'mt-4 flex' : 'hidden sm:flex',
          )}
        >
          <NavLink
            to="/"
            className={({ isActive }) =>
              clsx(
                'rounded-full px-4 py-2 text-center transition-colors',
                isActive
                  ? 'bg-brand-500 shadow-brand-500/25 text-white shadow-lg'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-white/90 dark:hover:bg-white/15',
              )
            }
          >
            Menu
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              clsx(
                'rounded-full px-4 py-2 text-center transition-colors',
                isActive
                  ? 'bg-slate-900 text-white shadow shadow-slate-900/10 dark:bg-white dark:text-black'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-white/90 dark:hover:bg-white/15',
              )
            }
          >
            About
          </NavLink>
          {analyticsEnabled && (
            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-4 py-2 text-center transition-colors',
                  isActive
                    ? 'bg-brand-500/20 text-brand-700 shadow-brand-500/25 dark:bg-brand-500/20 dark:text-brand-100'
                    : 'text-slate-700 hover:bg-slate-900/5 dark:text-white/90 dark:hover:bg-white/15',
                )
              }
            >
              Analytics
            </NavLink>
          )}
          <NavLink
            to="/checkout"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2 rounded-full px-4 py-2 transition-colors',
                isActive
                  ? 'bg-brand-500/15 text-brand-700 shadow-brand-500/25 dark:bg-brand-500/20 dark:text-brand-100'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-white/90 dark:hover:bg-white/15',
              )
            }
          >
            Checkout
            <span
              className={clsx(
                'rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold tracking-[0.3em] uppercase transition',
                badgePulse &&
                  'animate-cart-pulse shadow-[0_0_0_4px_rgba(234,88,12,0.15)]',
              )}
            >
              {totalItems.toString().padStart(2, '0')}
            </span>
          </NavLink>
        </nav>
        <div className="order-4 flex w-full flex-col items-center gap-3 sm:order-3 sm:flex-row sm:justify-end sm:justify-self-end">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-3 py-2 text-xs font-semibold tracking-[0.25em] text-slate-700 uppercase transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white/85 dark:hover:bg-white/15"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-600 dark:border-white/25 dark:bg-white/15 dark:text-white/75">
              {isDark ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <SunMedium className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span>{isDark ? 'Dark' : 'Light'}</span>
          </button>
          <Link
            to="/checkout"
            aria-label="View your cart and proceed to checkout"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-xs font-semibold tracking-[0.25em] text-slate-700 uppercase transition hover:bg-white md:w-auto md:justify-end dark:border-white/20 dark:bg-white/10 dark:text-white/85 dark:hover:bg-white/15"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span
              className={clsx(
                'transition',
                badgePulse &&
                  'animate-cart-pulse shadow-[0_0_0_4px_rgba(234,88,12,0.12)]',
              )}
            >{`${totalItems.toString().padStart(2, '0')} ${pizzaLabel}`}</span>
            <span className="text-stone-400 transition-colors dark:text-white/40">
              •
            </span>
            <span className="text-slate-500 dark:text-white/80">
              {totalPrice ? `$${totalPrice.toFixed(2)}` : 'Empty'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
