import { NavLink } from "react-router-dom";
import { Moon, ShoppingCart, SunMedium } from "lucide-react";
import clsx from "clsx";
import { useCartStore } from "../stores/cart";
import { useTheme } from "../providers/theme-context";

export const Header = () => {
  const totalItems = useCartStore((state) => state.totalItems());
  const totalPrice = useCartStore((state) => state.totalPrice());
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/80 backdrop-blur transition-colors duration-300 dark:border-white/15 dark:bg-neutral-900/80">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-4 px-6 py-4 sm:gap-6 md:grid-cols-[auto_1fr_auto]">
        <NavLink
          to="/"
          className="order-1 flex items-center gap-3 justify-self-center md:justify-self-start"
        >
          <img
            src={`${import.meta.env.BASE_URL}loftwahs-pizza.png`}
            alt="Loftwah Pizza logo"
            className="h-10 w-auto rounded-full border border-stone-200/70 bg-white p-1 transition-colors dark:border-white/20 dark:bg-white/15"
          />
          <span className="font-display text-lg font-semibold uppercase tracking-[0.35em] text-slate-900 transition-colors dark:text-white">
            Loftwah Pizza
          </span>
        </NavLink>
        <nav className="order-2 flex w-full justify-center gap-3 text-sm font-medium text-slate-600 transition-colors dark:text-white/85 md:order-2 md:w-auto">
          <NavLink
            to="/"
            className={({ isActive }) =>
              clsx(
                "rounded-full px-4 py-2 transition-colors",
                isActive
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                  : "text-slate-700 hover:bg-slate-900/5 dark:text-white/90 dark:hover:bg-white/15",
              )
            }
          >
            Menu
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              clsx(
                "rounded-full px-4 py-2 transition-colors",
                isActive
                  ? "bg-slate-900 text-white shadow shadow-slate-900/10 dark:bg-white dark:text-black"
                  : "text-slate-700 hover:bg-slate-900/5 dark:text-white/90 dark:hover:bg-white/15",
              )
            }
          >
            About
          </NavLink>
        </nav>
        <div className="order-3 flex w-full flex-col items-center gap-3 md:order-3 md:flex-row md:justify-end md:justify-self-end">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-700 transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white/85 dark:hover:bg-white/15"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-600 dark:border-white/25 dark:bg-white/15 dark:text-white/75">
              {isDark ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <SunMedium className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span>{isDark ? "Dark" : "Light"}</span>
          </button>
          <div className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-700 transition-colors dark:border-white/20 dark:bg-white/10 dark:text-white/85 md:w-auto md:justify-end">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span>{totalItems.toString().padStart(2, "0")} slices</span>
            <span className="text-stone-400 transition-colors dark:text-white/40">
              •
            </span>
            <span className="text-slate-500 dark:text-white/80">
              {totalPrice ? `$${totalPrice.toFixed(2)}` : "Empty"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
