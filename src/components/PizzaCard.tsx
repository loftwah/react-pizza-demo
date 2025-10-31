import { useMemo, useState } from 'react';
import { Flame, Leaf, ShoppingCart } from 'lucide-react';
import clsx from 'clsx';
import { useCartStore } from '../stores/cart';
import type { Pizza, PizzaSize } from '../domain/pizza';
import { formatCurrency, priceForSize, sizeLabels } from '../domain/pizza';
import { useToast } from '../providers/toast-context';

type PizzaCardProps = {
  pizza: Pizza;
};

const sizeOrder: PizzaSize[] = ['small', 'medium', 'large'];

export const PizzaCard = ({ pizza }: PizzaCardProps) => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('medium');
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItems = useCartStore((state) => state.items);
  const { showToast } = useToast();

  const cartItem = useMemo(
    () => cartItems.find((item) => item.id === `${pizza.id}-${selectedSize}`),
    [cartItems, pizza.id, selectedSize],
  );

  const handleAdd = () => {
    addItem(pizza.id, selectedSize);
    showToast({
      message: `Added ${sizeLabels[selectedSize]} ${pizza.displayName} to your order`,
      tone: 'success',
    });
  };

  const handleIncrement = () => {
    addItem(pizza.id, selectedSize);
    showToast({
      message: `Added another ${sizeLabels[selectedSize]} ${pizza.displayName}`,
      tone: 'success',
    });
  };

  const handleDecrement = () => {
    if (!cartItem) return;
    decrementItem(cartItem.id);
    showToast({
      message: `Removed one ${sizeLabels[cartItem.size]} ${pizza.displayName}`,
      tone: 'info',
    });
  };

  const handleClear = () => {
    if (!cartItem) return;
    removeItem(cartItem.id);
    showToast({
      message: `Cleared ${sizeLabels[cartItem.size]} ${pizza.displayName} from cart`,
      tone: 'info',
    });
  };

  return (
    <article className="group hover:border-brand-400/60 hover:shadow-brand-500/20 relative flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white pb-6 text-slate-900 transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/20 dark:bg-white/10 dark:text-white">
      <img
        alt={pizza.displayName}
        src={pizza.image}
        loading="lazy"
        width={400}
        height={224}
        className="h-56 w-full object-cover transition group-hover:scale-105"
      />
      <div className="flex flex-1 flex-col gap-6 px-6 pt-5">
        <div>
          <div className="flex min-h-[2.75rem] items-center gap-2 text-xs tracking-[0.3em] text-slate-500 uppercase dark:text-white/60">
            {pizza.vegetarian && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-200">
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Vegetarian</span>
              </span>
            )}
            {pizza.spicy && (
              <span className="border-brand-500/50 bg-brand-500/10 text-brand-500 dark:text-brand-200 flex items-center gap-1.5 rounded-full border px-3 py-1">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Spicy</span>
              </span>
            )}
            {!pizza.vegetarian && !pizza.spicy && (
              <span className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold tracking-[0.3em] text-slate-300 uppercase dark:text-white/25">
                Signature
              </span>
            )}
          </div>
          <h3 className="font-display mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {pizza.displayName}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/70">
            {pizza.description}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <fieldset className="flex gap-2">
            <legend className="sr-only">Choose pizza size</legend>
            {sizeOrder.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={clsx(
                  'focus-visible:ring-brand-400 flex-1 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
                  size === selectedSize
                    ? 'border-brand-400 bg-brand-500 shadow-brand-500/20 focus-visible:ring-brand-400 text-white'
                    : 'hover:border-brand-200 hover:bg-brand-50 border-stone-200/70 bg-white text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:border-white/40 dark:hover:bg-white/15',
                )}
              >
                <div className="flex flex-col">
                  <span>{sizeLabels[size]}</span>
                  <span className="text-[10px] tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                    {formatCurrency(priceForSize(pizza, size))}
                  </span>
                </div>
              </button>
            ))}
          </fieldset>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatCurrency(priceForSize(pizza, selectedSize))}
            </span>
            <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
              {cartItem && (
                <>
                  <button
                    type="button"
                    onClick={handleDecrement}
                    aria-label={`Remove one ${pizza.displayName} (${sizeLabels[cartItem.size]}) from cart`}
                    className="focus-visible:ring-brand-300 dark:focus-visible:ring-brand-400 h-11 w-11 rounded-full border border-stone-300 bg-white text-lg text-slate-700 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/30 dark:bg-white/15 dark:text-white dark:hover:bg-white/25 dark:focus-visible:ring-offset-neutral-950"
                  >
                    −
                  </button>
                  <span className="w-9 text-center text-sm font-semibold tracking-[0.2em] text-slate-600 dark:text-white/85">
                    {cartItem.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    aria-label={`Add one ${pizza.displayName} (${sizeLabels[selectedSize]}) to cart`}
                    className="border-brand-500/80 bg-brand-500 hover:bg-brand-400 focus-visible:ring-brand-300 dark:hover:bg-brand-400/90 dark:focus-visible:ring-brand-400 h-11 w-11 rounded-full border text-lg text-white transition hover:scale-[1.05] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/40 dark:focus-visible:ring-offset-neutral-950"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="ml-2 text-xs tracking-[0.28em] text-slate-500 uppercase transition hover:text-slate-700 dark:text-white/70 dark:hover:text-white/85"
                  >
                    Clear
                  </button>
                </>
              )}
              {!cartItem && (
                <button
                  type="button"
                  onClick={handleAdd}
                  aria-label={`Add ${pizza.displayName} pizza to your order`}
                  className="group/cta bg-brand-500 shadow-brand-500/40 hover:bg-brand-400 focus-visible:ring-brand-200 dark:hover:bg-brand-400/90 dark:focus-visible:ring-brand-400 relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3 text-base font-semibold text-white shadow-xl transition hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none sm:w-auto dark:focus-visible:ring-offset-neutral-950"
                >
                  <ShoppingCart
                    className="h-5 w-5 transition-transform duration-200 group-hover/cta:-translate-y-0.5"
                    aria-hidden="true"
                  />
                  <span>Add Pizza to Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
