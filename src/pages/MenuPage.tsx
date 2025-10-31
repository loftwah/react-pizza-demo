import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Clock, Flame, Leaf, Pizza, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useMenu } from '../hooks/useMenu';
import type { PizzaFilter, PizzaSize } from '../domain/pizza';
import { formatCurrency, hasFilterMatch, sizeLabels } from '../domain/pizza';
import { PizzaCard } from '../components/PizzaCard';
import { useCartStore } from '../stores/cart';
import { useOrderHistory } from '../stores/orders';
import { useToast } from '../providers/toast-context';
import { isFeatureEnabled } from '../config/features';

const filters: { id: PizzaFilter; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All Pizzas', icon: Pizza },
  { id: 'vegetarian', label: 'Veg Only', icon: Leaf },
  { id: 'spicy', label: 'Bring the Heat', icon: Flame },
];

const activeFilterStyles: Record<PizzaFilter, string> = {
  all: 'border-slate-900 bg-slate-900 text-white shadow-slate-900/25 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:shadow-slate-100/20',
  vegetarian:
    'border-emerald-600 bg-emerald-500 text-white shadow-emerald-500/25 dark:border-emerald-200 dark:bg-emerald-200 dark:text-emerald-950 dark:shadow-emerald-200/30',
  spicy:
    'border-orange-500 bg-orange-500 text-white shadow-orange-500/25 dark:border-orange-200 dark:bg-orange-200 dark:text-orange-950 dark:shadow-orange-200/30',
};

type PersistedOrderStore = typeof useOrderHistory & {
  persist?: {
    hasHydrated?: () => boolean;
  };
};

const sizeOptions: PizzaSize[] = ['small', 'medium', 'large'];

const cardVariants = {
  initial: { opacity: 0, y: 32, scale: 0.96 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      delay: Math.min(index * 0.06, 0.3),
    },
  }),
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
} as const;

const PizzaCardSkeleton = () => (
  <article className="relative flex h-full animate-pulse flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white pb-6 text-slate-900 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white">
    <div className="h-56 w-full bg-slate-200/80 dark:bg-white/10" />
    <div className="flex flex-1 flex-col gap-6 px-6 pt-5">
      <div className="space-y-4">
        <div className="flex gap-2">
          <span className="h-6 w-20 rounded-full bg-slate-200/70 dark:bg-white/15" />
          <span className="h-6 w-16 rounded-full bg-slate-200/70 dark:bg-white/15" />
        </div>
        <div className="space-y-3">
          <div className="h-6 w-3/4 rounded-full bg-slate-200/80 dark:bg-white/20" />
          <div className="h-3 w-full rounded-full bg-slate-200/70 dark:bg-white/15" />
          <div className="h-3 w-4/5 rounded-full bg-slate-200/70 dark:bg-white/15" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <span className="h-11 flex-1 rounded-full bg-slate-200/70 dark:bg-white/15" />
          <span className="h-11 flex-1 rounded-full bg-slate-200/70 dark:bg-white/15" />
          <span className="h-11 flex-1 rounded-full bg-slate-200/70 dark:bg-white/15" />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="h-6 w-24 rounded-full bg-slate-200/80 dark:bg-white/20" />
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <span className="h-11 w-11 rounded-full bg-slate-200/80 dark:bg-white/20" />
            <span className="h-5 w-12 rounded-full bg-slate-200/70 dark:bg-white/15" />
            <span className="h-11 w-11 rounded-full bg-slate-200/80 dark:bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  </article>
);

export const MenuPage = () => {
  const [filter, setFilter] = useState<PizzaFilter>('all');
  const [isShopOpen, setIsShopOpen] = useState(false);
  const {
    data: pizzas,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useMenu();
  const totalPrice = useCartStore((state) => state.totalPrice());
  const totalItems = useCartStore((state) => state.totalItems());
  const addItemToCart = useCartStore((state) => state.addItem);
  const hydrateFromOrder = useCartStore((state) => state.hydrateFromOrder);
  const orderHistory = useOrderHistory((state) => state.orders);
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const sharedOrderId = searchParams.get('order');
  const ordersHydrated =
    (useOrderHistory as PersistedOrderStore).persist?.hasHydrated?.() ?? true;
  const [isHydratingSharedOrder, setIsHydratingSharedOrder] = useState(false);

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
      filter === 'all' ? 'Menu' : filters.find((f) => f.id === filter)?.label
    }`;
  }, [filter]);

  useEffect(() => {
    if (!sharedOrderId || !ordersHydrated) return;

    setIsHydratingSharedOrder(true);
    try {
      const matchingOrder = orderHistory.find(
        (order) => order.id === sharedOrderId,
      );
      if (matchingOrder) {
        hydrateFromOrder(matchingOrder);
        showToast({
          message: `Recreated order ${matchingOrder.id} in your cart.`,
          tone: 'success',
        });
      } else {
        showToast({
          message:
            'Shared order not found on this device. Create it once to sync locally.',
          tone: 'info',
        });
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('order');
      setSearchParams(nextParams, { replace: true });
    } finally {
      setIsHydratingSharedOrder(false);
    }
  }, [
    hydrateFromOrder,
    orderHistory,
    ordersHydrated,
    searchParams,
    setSearchParams,
    sharedOrderId,
    showToast,
  ]);

  const filteredPizzas = useMemo(
    () => pizzas?.filter((pizza) => hasFilterMatch(pizza, filter)) ?? [],
    [filter, pizzas],
  );

  const handleSurprise = useCallback(() => {
    const availablePizzas =
      filteredPizzas.length > 0 ? filteredPizzas : (pizzas ?? []);
    if (availablePizzas.length === 0) {
      showToast({
        message: 'Menu still loading—your surprise slice is moments away.',
        tone: 'info',
      });
      return;
    }
    const randomPizza =
      availablePizzas[Math.floor(Math.random() * availablePizzas.length)];
    const randomSize =
      sizeOptions[Math.floor(Math.random() * sizeOptions.length)];
    addItemToCart(randomPizza.id, randomSize);
    showToast({
      message: `Chef added a ${sizeLabels[randomSize]} ${randomPizza.displayName}!`,
      tone: 'success',
    });
  }, [addItemToCart, filteredPizzas, pizzas, showToast]);

  return (
    <motion.section
      className="flex flex-col gap-10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="flex flex-col gap-6 text-center text-slate-900 sm:text-left dark:text-white">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-between">
          <div className="max-w-lg">
            <p className="text-xs tracking-[0.35em] text-slate-500 uppercase dark:text-white/60">
              Fresh Dough • 72 Hour Ferment
            </p>
            <h1 className="font-display text-4xl font-semibold text-slate-900 sm:text-5xl dark:text-white">
              The Menu
            </h1>
          </div>
          <motion.div
            className={clsx(
              'flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold tracking-[0.3em] uppercase transition sm:justify-start',
              isShopOpen
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200'
                : 'border-brand-500/40 bg-brand-500/15 text-brand-600 dark:bg-brand-500/25 dark:text-brand-100',
            )}
            animate={{
              scale: isShopOpen ? [1, 1.04, 1] : [1, 1.02, 1],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
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
          </motion.div>
        </div>
        <p className="mx-auto max-w-3xl text-sm text-slate-600 sm:mx-0 dark:text-white/70">
          Every pizza is hand-stretched, stone baked, and finished with
          house-made oils. Choose your vibe below – vegetarian for the green
          lovers or dial up the heat if you dare. Sizes scale flavour and price,
          so grab what matches your appetite.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs tracking-[0.3em] uppercase sm:justify-start">
          {filters.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={clsx(
                'flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold tracking-[0.3em] uppercase transition focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-slate-100 dark:focus-visible:ring-offset-slate-950',
                filter === id
                  ? activeFilterStyles[id]
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white',
              )}
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -4 }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </motion.button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase sm:justify-start">
          {isFeatureEnabled('surpriseMe') ? (
            <>
              <motion.button
                type="button"
                onClick={handleSurprise}
                className="border-brand-500/40 bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 focus-visible:ring-brand-300 dark:border-brand-200/40 dark:bg-brand-500/15 dark:text-brand-100 dark:hover:bg-brand-500/25 dark:focus-visible:ring-brand-300/80 inline-flex items-center gap-2 rounded-full border px-5 py-2 font-semibold tracking-[0.3em] transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-slate-950"
                whileTap={{ scale: 0.95 }}
                whileHover={{ x: 2 }}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Surprise me</span>
              </motion.button>
              <span className="text-[11px] tracking-[0.35em] text-slate-400 dark:text-white/40">
                Chef picks a random pizza & size
              </span>
            </>
          ) : (
            <span className="text-[11px] tracking-[0.35em] text-slate-400 dark:text-white/40">
              Surprise service temporarily offline
            </span>
          )}
        </div>
      </header>

      <AnimatePresence>
        {isHydratingSharedOrder && (
          <motion.div
            key="shared-order-hydration"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-500/20 dark:text-emerald-100 flex items-center justify-center gap-3 rounded-2xl border px-5 py-3 text-xs font-semibold tracking-[0.3em] uppercase"
            role="status"
            aria-live="polite"
          >
            Hydrating shared order…
          </motion.div>
        )}
      </AnimatePresence>

      {(isLoading || (isFetching && !pizzas)) && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PizzaCardSkeleton key={index} />
          ))}
        </div>
      )}

      {error && (
        <div className="border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-100 flex flex-col gap-4 rounded-2xl border p-6 text-sm">
          <span>
            {error instanceof Error
              ? error.message
              : 'We burned this batch. Try again shortly!'}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="self-start rounded-full border border-brand-500/40 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-700 transition hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-brand-200/50 dark:bg-white/10 dark:text-brand-100 dark:hover:bg-white/15 dark:focus-visible:ring-brand-300/80 dark:focus-visible:ring-offset-slate-950"
          >
            Retry loading menu
          </button>
        </div>
      )}

      {!isLoading && !error && filteredPizzas.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="sync">
            {filteredPizzas.map((pizza, index) => (
              <motion.div
                key={pizza.id}
                layout
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={index}
              >
                <PizzaCard pizza={pizza} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <aside className="flex flex-col items-center gap-3 self-center rounded-3xl border border-stone-200/70 bg-white/70 px-6 py-5 text-center text-xs tracking-[0.3em] text-slate-600 uppercase sm:items-end sm:self-end sm:text-right dark:border-white/20 dark:bg-white/10 dark:text-white/70">
        <span>Your running total: {formatCurrency(totalPrice)}</span>
        {totalItems > 0 ? (
          <Link
            to="/checkout"
            className="border-brand-500/40 bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 focus-visible:ring-brand-300 dark:border-brand-200/30 dark:bg-brand-500/15 dark:text-brand-100 dark:hover:bg-brand-500/20 dark:focus-visible:ring-brand-400 inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.35em] transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950"
          >
            Proceed to checkout
          </Link>
        ) : (
          <span className="text-[11px] tracking-[0.35em] text-slate-400 dark:text-white/40">
            Add pizzas to unlock checkout
          </span>
        )}
      </aside>
    </motion.section>
  );
};

(MenuPage as typeof MenuPage & { describe?: () => string[] }).describe = () => [
  'loadMenu',
  'applyFilter',
  'renderCards',
  'handleSurprise',
  'syncSharedOrder',
];
