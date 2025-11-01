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

  const imageSrcSet = `${pizza.image} 400w, ${pizza.image} 640w, ${pizza.image} 960w`;
  const imageSizes = '(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw';

  return (
    <article className="group hover:border-red-400/60 hover:shadow-red-500/20 relative flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white pb-6 text-slate-900 transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/20 dark:bg-white/10 dark:text-white">
      <img
        alt={pizza.displayName}
        src={pizza.image}
        srcSet={imageSrcSet}
        sizes={imageSizes}
        loading="lazy"
        decoding="async"
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
              <span className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-red-500 dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-200">
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
            {sizeOrder.map((size) => {
              const isSelected = size === selectedSize;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedSize(size);
                    }
                  }}
                  aria-pressed={isSelected}
                  className={clsx(
                    'flex-1 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-slate-300 dark:focus-visible:ring-offset-neutral-900 dark:focus-visible:ring-white/40',
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.28)] focus-visible:ring-slate-900 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:shadow-[0_12px_28px_rgba(226,232,240,0.28)] dark:focus-visible:ring-slate-100'
                      : 'border-stone-200/70 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 focus-visible:ring-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:border-white/40 dark:hover:bg-white/15',
                  )}
                >
                  <div className="flex flex-col">
                    <span>{sizeLabels[size]}</span>
                    <span
                      className={clsx(
                        'text-[10px] tracking-[0.3em] uppercase transition-colors',
                        isSelected
                          ? 'text-white/85 dark:text-slate-700'
                          : 'text-slate-400 dark:text-white/50',
                      )}
                    >
                      {formatCurrency(priceForSize(pizza, size))}
                    </span>
                  </div>
                </button>
              );
            })}
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
                    className="h-11 w-11 rounded-full border border-stone-300 bg-white text-lg text-slate-700 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-red-300 focus-visible:outline-none dark:border-white/30 dark:bg-white/15 dark:text-white dark:hover:bg-white/25 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
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
                    className="h-11 w-11 rounded-full border border-red-600/70 bg-red-600 text-lg text-white transition hover:scale-[1.05] hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-red-300 focus-visible:outline-none dark:border-red-400/60 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
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
                  className="group/cta relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-red-600 px-7 py-3 text-base font-semibold text-white shadow-xl shadow-red-600/40 transition hover:scale-[1.02] hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-red-300 focus-visible:outline-none sm:w-auto dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
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

if (import.meta.env.DEV) {
  Object.defineProperty(PizzaCard, 'displayName', {
    value: 'Station.PizzaLine',
  });
}
