import { useMemo, useState } from 'react'
import { Flame, Leaf, ShoppingCart } from 'lucide-react'
import clsx from 'clsx'
import { useCartStore } from '../stores/cart'
import type { Pizza, PizzaSize } from '../domain/pizza'
import { formatCurrency, priceForSize, sizeLabels } from '../domain/pizza'

type PizzaCardProps = {
  pizza: Pizza
}

const sizeOrder: PizzaSize[] = ['small', 'medium', 'large']

export const PizzaCard = ({ pizza }: PizzaCardProps) => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('medium')
  const addItem = useCartStore((state) => state.addItem)
  const decrementItem = useCartStore((state) => state.decrementItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const cartItems = useCartStore((state) => state.items)

  const cartItem = useMemo(
    () => cartItems.find((item) => item.id === `${pizza.id}-${selectedSize}`),
    [cartItems, pizza.id, selectedSize],
  )

  const handleAdd = () => {
    addItem(pizza.id, selectedSize)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white pb-6 text-slate-900 transition hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-2xl hover:shadow-brand-500/20 dark:border-white/20 dark:bg-white/10 dark:text-white">
      <img
        alt={pizza.displayName}
        src={pizza.image}
        loading="lazy"
        className="h-56 w-full object-cover transition group-hover:scale-105"
      />
      <div className="flex flex-1 flex-col gap-6 px-6 pt-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">
            {pizza.vegetarian && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-200">
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Vegetarian</span>
              </span>
            )}
            {pizza.spicy && (
              <span className="flex items-center gap-1.5 rounded-full border border-brand-500/50 bg-brand-500/10 px-3 py-1 text-brand-500 dark:text-brand-200">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Spicy</span>
              </span>
            )}
          </div>
          <h3 className="mt-3 font-display text-2xl font-semibold text-slate-900 dark:text-white">
            {pizza.displayName}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/70">{pizza.description}</p>
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
                  'flex-1 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
                  size === selectedSize
                    ? 'border-brand-400 bg-brand-500 text-white shadow-brand-500/20 focus-visible:ring-brand-400'
                    : 'border-stone-200/70 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:border-white/40 dark:hover:bg-white/15',
                )}
              >
                <div className="flex flex-col">
                  <span>{sizeLabels[size]}</span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-white/40">
                    {formatCurrency(priceForSize(pizza, size))}
                  </span>
                </div>
              </button>
            ))}
          </fieldset>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatCurrency(priceForSize(pizza, selectedSize))}
            </span>
            <div className="flex items-center gap-2">
              {cartItem && (
                <>
                  <button
                    type="button"
                    onClick={() => decrementItem(cartItem.id)}
                    className="h-10 w-10 rounded-full border border-stone-300 bg-white text-lg text-slate-700 transition hover:bg-stone-100 dark:border-white/30 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tracking-[0.2em] text-slate-600 dark:text-white/85">
                    {cartItem.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => addItem(pizza.id, selectedSize)}
                    className="h-10 w-10 rounded-full border border-brand-500/80 bg-brand-500 text-lg text-white transition hover:bg-brand-400 dark:border-white/30"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(cartItem.id)}
                    className="ml-2 text-xs uppercase tracking-[0.3em] text-slate-500 transition hover:text-slate-700 dark:text-white/70 dark:hover:text-white/85"
                  >
                    Clear
                  </button>
                </>
              )}
              {!cartItem && (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-600 hover:to-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-brand-400 dark:focus-visible:ring-offset-neutral-950"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  <span>Add To Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
