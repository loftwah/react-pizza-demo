import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, Flame, Leaf, Pizza } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useMenu } from "../hooks/useMenu";
import type { PizzaFilter } from "../domain/pizza";
import { hasFilterMatch } from "../domain/pizza";
import { PizzaCard } from "../components/PizzaCard";
import { useCartStore } from "../stores/cart";
import { formatCurrency } from "../domain/pizza";

const filters: { id: PizzaFilter; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All Pizzas", icon: Pizza },
  { id: "vegetarian", label: "Veg Only", icon: Leaf },
  { id: "spicy", label: "Bring the Heat", icon: Flame },
];

const activeFilterStyles: Record<PizzaFilter, string> = {
  all: "border-slate-900 bg-slate-900 text-white shadow-slate-900/25 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:shadow-slate-100/20",
  vegetarian:
    "border-emerald-600 bg-emerald-500 text-white shadow-emerald-500/25 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950 dark:shadow-emerald-200/30",
  spicy:
    "border-orange-500 bg-orange-500 text-white shadow-orange-500/25 dark:border-orange-200 dark:bg-orange-200 dark:text-orange-950 dark:shadow-orange-200/30",
};

export const MenuPage = () => {
  const [filter, setFilter] = useState<PizzaFilter>("all");
  const [isShopOpen, setIsShopOpen] = useState(false);
  const { data: pizzas, isLoading, error } = useMenu();
  const totalPrice = useCartStore((state) => state.totalPrice());

  useEffect(() => {
    const evaluateOpenStatus = () => {
      const now = new Date();
      const hour = now.getHours();
      // Open from 11am to 10pm
      setIsShopOpen(hour >= 11 && hour < 22);
    };
    evaluateOpenStatus();
    const timer = setInterval(evaluateOpenStatus, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = `Loftwah Pizza • ${
      filter === "all" ? "Menu" : filters.find((f) => f.id === filter)?.label
    }`;
  }, [filter]);

  const filteredPizzas = useMemo(
    () => pizzas?.filter((pizza) => hasFilterMatch(pizza, filter)) ?? [],
    [filter, pizzas],
  );

  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col gap-6 text-center text-slate-900 dark:text-white sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-between">
          <div className="max-w-lg">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-white/60">
              Fresh Dough • 72 Hour Ferment
            </p>
            <h1 className="font-display text-4xl font-semibold text-slate-900 dark:text-white sm:text-5xl">
              The Menu
            </h1>
          </div>
          <div
            className={clsx(
              "flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition sm:justify-start",
              isShopOpen
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200"
                : "border-brand-500/40 bg-brand-500/15 text-brand-600 dark:bg-brand-500/25 dark:text-brand-100",
            )}
          >
            {isShopOpen ? (
              <>
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                <span>Open for pickup & delivery</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>We reopen at 11:00</span>
              </>
            )}
          </div>
        </div>
        <p className="mx-auto max-w-3xl text-sm text-slate-600 dark:text-white/70 sm:mx-0">
          Every pizza is hand-stretched, stone baked, and finished with
          house-made oils. Choose your vibe below – vegetarian for the green
          lovers or dial up the heat if you dare. Sizes scale flavour and price,
          so grab what matches your appetite.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.3em] sm:justify-start">
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-slate-100 dark:focus-visible:ring-offset-slate-950",
                filter === id
                  ? activeFilterStyles[id]
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </header>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] animate-pulse rounded-3xl border border-stone-200/70 bg-white/60 dark:border-white/15 dark:bg-white/10"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-6 text-sm text-brand-700 dark:text-brand-100">
          {error instanceof Error
            ? error.message
            : "We burned this batch. Try again shortly!"}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPizzas.map((pizza) => (
            <PizzaCard key={pizza.id} pizza={pizza} />
          ))}
        </div>
      )}

      <aside className="self-center rounded-3xl border border-stone-200/70 bg-white/70 px-6 py-5 text-center text-xs uppercase tracking-[0.3em] text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-white/70 sm:self-end sm:text-right">
        Your running total: {formatCurrency(totalPrice)}
      </aside>
    </section>
  );
};
