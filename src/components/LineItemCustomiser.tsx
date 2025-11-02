import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useCartStore } from '../stores/cart';
import { getPizzaById } from '../domain/menu';
import {
  extrasForPizza,
  formatCurrency,
  normalizeCustomization,
} from '../domain/pizza';
import type { OrderLineItem } from '../stores/orders';
import type { IngredientId } from '../domain/ingredients';
import { formatListPreview } from '../shared-utils/list-format';

type LineItemCustomiserProps = {
  item: OrderLineItem;
};

const MAX_EXTRA_QUANTITY = 3;

export const LineItemCustomiser = ({ item }: LineItemCustomiserProps) => {
  const extraQuantities = useMemo(() => {
    const quantities = new Map<IngredientId, number>();
    const customization = normalizeCustomization({
      removedIngredients: item.customization?.removedIngredients ?? [],
      addedIngredients:
        item.customization?.addedIngredients?.map((ingredient) => ({
          id: ingredient.id,
          quantity: ingredient.quantity,
        })) ?? [],
    });
    customization.addedIngredients.forEach(({ id, quantity }) => {
      quantities.set(id, quantity);
    });
    return quantities;
  }, [item.customization]);
  const [isOpen, setIsOpen] = useState(() => extraQuantities.size > 0);
  const updateCustomization = useCartStore((state) => state.updateCustomization);
  const pizza = item.pizzaId ? getPizzaById(item.pizzaId) : null;

  const availableExtras = useMemo(
    () => (pizza ? extrasForPizza(pizza) : []),
    [pizza],
  );

  if (!pizza || availableExtras.length === 0) {
    return null;
  }

  const extrasSummary = availableExtras
    .map((extra) => {
      const quantity = extraQuantities.get(extra.id);
      if (!quantity) return null;
      return quantity > 1 ? `${extra.name} ×${quantity}` : extra.name;
    })
    .filter((value): value is string => Boolean(value));

  const summaryLabel =
    extrasSummary.length > 0
      ? formatListPreview(extrasSummary)
      : 'No extras added yet';
  const summaryTooltip =
    extrasSummary.length > 0 ? extrasSummary.join(', ') : summaryLabel;
  const extrasCount = extrasSummary.length;

  const handleAdjustExtra = (ingredientId: IngredientId, delta: number) => {
    const currentQuantity = extraQuantities.get(ingredientId) ?? 0;
    const nextQuantity = Math.max(
      0,
      Math.min(MAX_EXTRA_QUANTITY, currentQuantity + delta),
    );
    if (nextQuantity === currentQuantity) return;

    const nextAdditions = new Map(extraQuantities);
    if (nextQuantity === 0) {
      nextAdditions.delete(ingredientId);
    } else {
      nextAdditions.set(ingredientId, nextQuantity);
    }

    updateCustomization(item.id, {
      removedIngredients: item.customization?.removedIngredients ?? [],
      addedIngredients: Array.from(nextAdditions.entries()).map(
        ([id, quantity]) => ({ id, quantity }),
      ),
    });
  };

  const handleResetExtras = () => {
    if (extraQuantities.size === 0) return;
    updateCustomization(item.id, {
      removedIngredients: item.customization?.removedIngredients ?? [],
      addedIngredients: [],
    });
  };

  return (
    <div className="mt-3 w-full space-y-2 rounded-2xl border border-dashed border-slate-300 bg-white/55 p-3 dark:border-white/20 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        title={summaryTooltip}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-left text-[11px] font-semibold tracking-[0.25em] text-slate-600 uppercase transition hover:bg-white dark:bg-white/10 dark:text-white/65 dark:hover:bg-white/15"
      >
        <span className="flex min-h-[1.5em] flex-1 items-center justify-between gap-3">
          <span>{isOpen ? 'Hide extras' : 'Edit extras'}</span>
          <span className="flex items-center gap-2 text-[9px] font-medium normal-case tracking-[0.25em] text-slate-400 dark:text-white/45">
            <span className="flex min-w-[1.5rem] items-center justify-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-slate-500 dark:border-white/25 dark:bg-white/10 dark:text-white/60">
              {extrasCount}
            </span>
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-500 dark:text-white/60" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-white/60" />
        )}
      </button>
      {isOpen ? (
        <div className="space-y-2 rounded-2xl border border-stone-200/60 bg-white/75 p-3 text-xs text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
          {availableExtras.map((extra) => {
            const quantity = extraQuantities.get(extra.id) ?? 0;
            return (
              <div
                key={extra.id}
                className="grid min-w-0 items-center gap-3 rounded-xl bg-white/90 px-3 py-2 dark:bg-white/10 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {extra.name}
                  </span>
                  <span className="tabular-nums text-[10px] tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                    {formatCurrency(extra.price)}
                  </span>
                </div>
                <div className="flex min-w-[7.5rem] items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustExtra(extra.id, -1)}
                    disabled={quantity === 0}
                    className={clsx(
                      'flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:text-white/75 dark:hover:bg-white/15',
                      quantity === 0 && 'pointer-events-none',
                    )}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-slate-800 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdjustExtra(extra.id, 1)}
                    disabled={quantity >= MAX_EXTRA_QUANTITY}
                    className={clsx(
                      'flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:text-white/75 dark:hover:bg-white/15',
                      quantity >= MAX_EXTRA_QUANTITY && 'pointer-events-none',
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetExtras}
              className="text-[11px] font-semibold tracking-[0.25em] text-red-500 uppercase transition hover:text-red-600 dark:text-red-300 dark:hover:text-red-200"
            >
              Reset extras
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

if (import.meta.env.DEV) {
  Object.defineProperty(LineItemCustomiser, 'displayName', {
    value: 'Station.CheckoutCustomiser',
  });
}
