import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Flame,
  Leaf,
  ShoppingCart,
  SlidersHorizontal,
  Sprout,
} from 'lucide-react';
import clsx from 'clsx';
import { useCartStore } from '../stores/cart';
import type { Pizza, PizzaSize } from '../domain/pizza';
import {
  composeCartItemKey,
  customizationUpcharge,
  extrasForPizza,
  formatCurrency,
  hasCustomizations,
  normalizeCustomization,
  priceForConfiguration,
  sizeLabels,
} from '../domain/pizza';
import {
  isIngredientId,
  type IngredientDefinition,
  type IngredientId,
} from '../domain/ingredients';
import { useToast } from '../providers/toast-context';
import { formatListPreview } from '../shared-utils/list-format';

type PizzaCardProps = {
  pizza: Pizza;
};

const sizeOrder: PizzaSize[] = ['small', 'medium', 'large'];

const resolveSizeLabel = (pizza: Pizza, size: PizzaSize) =>
  pizza.sizeLabelsOverride?.[size] ?? sizeLabels[size];

const SLUG_PREFIXES = [
  'extra-',
  'vegan-',
  'double-',
  'triple-',
  'dairy-free-',
  'gluten-free-',
  'plant-based-',
];

const slugifyIngredientKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const expandSlugVariants = (slug: string) => {
  const queue = [slug];
  const variants = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || variants.has(current)) continue;
    variants.add(current);
    SLUG_PREFIXES.forEach((prefix) => {
      if (current.startsWith(prefix)) {
        queue.push(current.slice(prefix.length));
      }
    });
  }
  return variants;
};

const resolveSlugVariants = (value: string) =>
  expandSlugVariants(slugifyIngredientKey(value));

const isIngredientAvailable = (
  toppings: string[],
  ingredient: string,
): boolean => toppings.some((topping) => topping === ingredient);

const MAX_EXTRA_QUANTITY = 3;

const PizzaCardInner = ({ pizza }: PizzaCardProps) => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('medium');
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [addedIngredients, setAddedIngredients] = useState<
    Partial<Record<IngredientId, number>>
  >({});
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const cartItems = useCartStore((state) => state.items);
  const { showToast } = useToast();
  const ctaLabel = useMemo(() => {
    if (pizza.category === 'drink') return 'Add Drink to Order';
    if (pizza.category === 'dessert') return 'Add Dessert to Order';
    return 'Add Pizza to Order';
  }, [pizza.category]);

  const availableExtras = useMemo(() => extrasForPizza(pizza), [pizza]);
  const extrasById = useMemo(
    () =>
      new Map<IngredientId, IngredientDefinition>(
        availableExtras.map((ingredient) => [ingredient.id, ingredient]),
      ),
    [availableExtras],
  );
  const baseSlugVariants = useMemo(() => {
    const map = new Map<string, Set<string>>();
    pizza.toppings.forEach((topping) => {
      map.set(topping, resolveSlugVariants(topping));
    });
    return map;
  }, [pizza.toppings]);
  const extraSlugVariants = useMemo(() => {
    const map = new Map<IngredientId, Set<string>>();
    availableExtras.forEach((extra) => {
      const variants = new Set<string>();
      resolveSlugVariants(extra.name).forEach((variant) =>
        variants.add(variant),
      );
      resolveSlugVariants(extra.id).forEach((variant) => variants.add(variant));
      map.set(extra.id, variants);
    });
    return map;
  }, [availableExtras]);
  const conflictingExtrasByBase = useMemo(() => {
    const map = new Map<string, IngredientId[]>();
    pizza.toppings.forEach((topping) => {
      const baseVariants = baseSlugVariants.get(topping);
      if (!baseVariants) return;
      availableExtras.forEach((extra) => {
        const extraVariants = extraSlugVariants.get(extra.id);
        if (!extraVariants) return;
        const hasOverlap = [...extraVariants].some((variant) =>
          baseVariants.has(variant),
        );
        if (!hasOverlap) return;
        const existing = map.get(topping) ?? [];
        if (!existing.includes(extra.id)) {
          map.set(topping, [...existing, extra.id]);
        }
      });
    });
    return map;
  }, [availableExtras, baseSlugVariants, extraSlugVariants, pizza.toppings]);
  const blockedExtraIds = useMemo(() => {
    if (removedIngredients.length === 0) {
      return new Set<IngredientId>();
    }
    const blocked = new Set<IngredientId>();
    removedIngredients.forEach((ingredient) => {
      const baseVariants = baseSlugVariants.get(ingredient);
      if (!baseVariants) return;
      availableExtras.forEach((extra) => {
        const extraVariants = extraSlugVariants.get(extra.id);
        if (!extraVariants) return;
        const hasOverlap = [...extraVariants].some((variant) =>
          baseVariants.has(variant),
        );
        if (hasOverlap) {
          blocked.add(extra.id);
        }
      });
    });
    return blocked;
  }, [
    availableExtras,
    baseSlugVariants,
    extraSlugVariants,
    removedIngredients,
  ]);

  const currentCustomization = useMemo(
    () =>
      normalizeCustomization({
        removedIngredients,
        addedIngredients: Object.entries(addedIngredients)
          .filter((entry): entry is [IngredientId, number] => {
            const [id, quantity] = entry;
            return (
              isIngredientId(id) &&
              typeof quantity === 'number' &&
              Number.isFinite(quantity)
            );
          })
          .map(([id, quantity]) => ({
            id,
            quantity,
          })),
      }),
    [removedIngredients, addedIngredients],
  );

  const currentItemId = useMemo(
    () => composeCartItemKey(pizza.id, selectedSize, currentCustomization),
    [pizza.id, selectedSize, currentCustomization],
  );

  const cartItem = useMemo(
    () => cartItems.find((item) => item.id === currentItemId),
    [cartItems, currentItemId],
  );

  const unitPrice = useMemo(
    () => priceForConfiguration(pizza, selectedSize, currentCustomization),
    [pizza, selectedSize, currentCustomization],
  );

  const upcharge = useMemo(
    () => customizationUpcharge(currentCustomization),
    [currentCustomization],
  );

  const hasMods = hasCustomizations(currentCustomization);
  const removedSummary = useMemo(
    () =>
      currentCustomization.removedIngredients.filter((ingredient) =>
        isIngredientAvailable(pizza.toppings, ingredient),
      ),
    [currentCustomization.removedIngredients, pizza.toppings],
  );
  const addedSummary = useMemo(() => {
    if (currentCustomization.addedIngredients.length === 0) return [];
    return currentCustomization.addedIngredients
      .map(({ id, quantity }) => {
        const label = extrasById.get(id)?.name ?? id;
        return quantity > 1 ? `${label} ×${quantity}` : label;
      })
      .filter(Boolean);
  }, [currentCustomization.addedIngredients, extrasById]);

  const canCustomize =
    pizza.allowCustomization !== false &&
    (pizza.toppings.length > 0 || availableExtras.length > 0);

  const toggleBaseIngredient = (ingredient: string) => {
    setRemovedIngredients((current) => {
      if (current.includes(ingredient)) {
        return current.filter((value) => value !== ingredient);
      }
      const conflicts = conflictingExtrasByBase.get(ingredient);
      if (conflicts && conflicts.length > 0) {
        setAddedIngredients((currentAdded) => {
          let mutated = false;
          const next = { ...currentAdded };
          conflicts.forEach((extraId) => {
            if (next[extraId]) {
              delete next[extraId];
              mutated = true;
            }
          });
          return mutated ? next : currentAdded;
        });
      }
      return [...current, ingredient];
    });
  };

  const adjustExtraQuantity = (ingredientId: IngredientId, delta: number) => {
    setAddedIngredients((current) => {
      const next = { ...current };
      const previous = next[ingredientId] ?? 0;
      const updated = Math.max(
        0,
        Math.min(MAX_EXTRA_QUANTITY, previous + delta),
      );
      if (updated <= 0) {
        delete next[ingredientId];
      } else {
        next[ingredientId] = updated;
      }
      return next;
    });
  };

  const handleResetCustomization = () => {
    setRemovedIngredients([]);
    setAddedIngredients({});
  };

  const handleAdd = () => {
    addItem(pizza.id, selectedSize, currentCustomization);
    const label = resolveSizeLabel(pizza, selectedSize);
    const modifier = hasMods ? ' with your tweaks' : '';
    showToast({
      message: `Added ${label} ${pizza.displayName}${modifier} to your order`,
      tone: 'success',
    });
  };

  const handleIncrement = () => {
    addItem(pizza.id, selectedSize, currentCustomization);
    const label = resolveSizeLabel(pizza, selectedSize);
    showToast({
      message: `Added another ${label} ${pizza.displayName}`,
      tone: 'success',
    });
  };

  const handleDecrement = () => {
    if (!cartItem) return;
    decrementItem(cartItem.id);
    const label = resolveSizeLabel(pizza, cartItem.size);
    showToast({
      message: `Removed one ${label} ${pizza.displayName}`,
      tone: 'info',
    });
  };

  const handleClear = () => {
    if (!cartItem) return;
    removeItem(cartItem.id);
    const label = resolveSizeLabel(pizza, cartItem.size);
    showToast({
      message: `Cleared ${label} ${pizza.displayName} from cart`,
      tone: 'info',
    });
  };

  const imageSrcSet = `${pizza.image} 400w, ${pizza.image} 640w, ${pizza.image} 960w`;
  const imageSizes = '(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 90vw';

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white pb-6 text-slate-900 transition hover:-translate-y-1 hover:border-red-400/60 hover:shadow-2xl hover:shadow-red-500/20 dark:border-white/20 dark:bg-white/10 dark:text-white">
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
          <div className="flex min-h-[2.75rem] flex-wrap items-center gap-2 text-xs tracking-[0.3em] text-slate-500 uppercase dark:text-white/60">
            {pizza.vegan && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:border-emerald-200/50 dark:text-emerald-200">
                <Sprout className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Vegan</span>
              </span>
            )}
            {!pizza.vegan && pizza.vegetarian && (
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
            {!pizza.vegetarian && !pizza.vegan && !pizza.spicy && (
              <span className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold tracking-[0.3em] text-slate-300 uppercase dark:text-white/25">
                Signature
              </span>
            )}
            {pizza.category === 'dessert' && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-amber-600 dark:border-amber-200/40 dark:bg-amber-200/20 dark:text-amber-100">
                Dessert
              </span>
            )}
            {pizza.category === 'drink' && (
              <span className="rounded-full border border-slate-300/60 bg-slate-100 px-3 py-1 text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-white/85">
                Drink
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
        <div className="flex flex-1 flex-col gap-4">
          <fieldset className="flex gap-2">
            <legend className="sr-only">Choose size</legend>
            {sizeOrder.map((size) => {
              const isSelected = size === selectedSize;
              const label = resolveSizeLabel(pizza, size);
              const priceLabel = formatCurrency(
                priceForConfiguration(pizza, size, currentCustomization),
              );
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
                  aria-label={`${label} for ${priceLabel}`}
                  className={clsx(
                    'flex-1 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-white/40 dark:focus-visible:ring-offset-neutral-900',
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.28)] focus-visible:ring-slate-900 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:shadow-[0_12px_28px_rgba(226,232,240,0.28)] dark:focus-visible:ring-slate-100'
                      : 'border-stone-200/70 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 focus-visible:ring-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:border-white/40 dark:hover:bg-white/15',
                  )}
                >
                  <div className="flex flex-col">
                    <span>{label}</span>
                    <span
                      className={clsx(
                        'text-[10px] tracking-[0.3em] uppercase tabular-nums transition-colors',
                        isSelected
                          ? 'text-white/85 dark:text-slate-700'
                          : 'text-slate-400 dark:text-white/50',
                      )}
                    >
                      {priceLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </fieldset>

          {canCustomize && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white/70">
              <button
                type="button"
                onClick={() => setIsCustomizerOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-transparent px-2 py-1.5 text-[11px] font-semibold tracking-[0.28em] uppercase transition hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:hover:text-white dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
                aria-expanded={isCustomizerOpen}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Customize ingredients
                </span>
                {isCustomizerOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
              {isCustomizerOpen && (
                <div className="mt-4 space-y-4">
                  {pizza.toppings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold tracking-[0.28em] text-slate-400 uppercase dark:text-white/40">
                        House toppings
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pizza.toppings.map((topping) => {
                          const isRemoved =
                            removedIngredients.includes(topping);
                          return (
                            <button
                              key={topping}
                              type="button"
                              onClick={() => toggleBaseIngredient(topping)}
                              aria-pressed={!isRemoved}
                              className={clsx(
                                'rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950',
                                isRemoved
                                  ? 'border-red-300/60 bg-red-50 text-red-500 hover:border-red-400 hover:bg-red-100 focus-visible:ring-red-300/50 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200 dark:hover:border-red-300/60 dark:hover:bg-red-500/20 dark:focus-visible:ring-red-300/60'
                                  : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-500/15 focus-visible:ring-emerald-300/60 dark:border-emerald-200/30 dark:bg-emerald-200/20 dark:text-emerald-100 dark:hover:border-emerald-100/40 dark:hover:bg-emerald-200/30 dark:focus-visible:ring-emerald-200/50',
                              )}
                            >
                              {isRemoved ? `Hold ${topping}` : topping}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {availableExtras.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold tracking-[0.28em] text-slate-400 uppercase dark:text-white/40">
                        Extra ingredients
                      </p>
                      <div className="space-y-2">
                        {availableExtras.map((ingredient) => {
                          const quantity = addedIngredients[ingredient.id] ?? 0;
                          const isBlocked = blockedExtraIds.has(ingredient.id);
                          const blockers = isBlocked
                            ? removedIngredients.filter((base) =>
                                (
                                  conflictingExtrasByBase.get(base) ?? []
                                ).includes(ingredient.id),
                              )
                            : [];
                          const blockedMessage =
                            blockers.length > 0
                              ? `Restore ${formatListPreview(blockers)} to add this extra`
                              : undefined;
                          const canIncrement =
                            !isBlocked && quantity < MAX_EXTRA_QUANTITY;
                          const canDecrement = quantity > 0;
                          return (
                            <div
                              key={ingredient.id}
                              aria-disabled={isBlocked || undefined}
                              className={clsx(
                                'flex w-full flex-col gap-3 rounded-[28px] border border-slate-200/70 bg-white px-4 py-3 text-[11px] font-semibold tracking-[0.2em] text-slate-600 uppercase sm:flex-row sm:items-center sm:justify-between dark:border-white/20 dark:bg-white/10 dark:text-white/75',
                                isBlocked && 'opacity-60',
                              )}
                            >
                              <div className="flex min-w-0 flex-1 flex-col gap-1 text-left leading-tight">
                                <span className="break-words">
                                  {ingredient.name}
                                </span>
                                <span className="text-[10px] tracking-[0.28em] text-slate-400 tabular-nums dark:text-white/50">
                                  +{formatCurrency(ingredient.price)}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center justify-end gap-1 rounded-full border border-slate-200/70 bg-white/90 px-2 py-0.5 text-xs text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-white/70">
                                <button
                                  type="button"
                                  onClick={() =>
                                    adjustExtraQuantity(ingredient.id, -1)
                                  }
                                  disabled={!canDecrement}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200/60 text-slate-500 transition enabled:hover:bg-red-500/10 enabled:hover:text-red-600 disabled:opacity-40 dark:border-white/20 dark:text-white/70 dark:enabled:hover:bg-red-500/15 dark:enabled:hover:text-red-200"
                                  aria-label={`Remove ${ingredient.name}`}
                                >
                                  −
                                </button>
                                <span className="w-5 text-center text-[11px] font-semibold tracking-[0.2em] text-slate-600 uppercase dark:text-white/80">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    adjustExtraQuantity(ingredient.id, 1)
                                  }
                                  disabled={!canIncrement}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200/60 text-slate-500 transition enabled:hover:bg-emerald-500/10 enabled:hover:text-emerald-600 disabled:opacity-40 dark:border-white/20 dark:text-white/70 dark:enabled:hover:bg-emerald-500/15 dark:enabled:hover:text-emerald-200"
                                  aria-label={`Add ${ingredient.name}`}
                                  title={blockedMessage}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] tracking-[0.25em] text-slate-400 uppercase dark:text-white/45">
                    {hasMods ? (
                      <button
                        type="button"
                        onClick={handleResetCustomization}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
                      >
                        Reset to house recipe
                      </button>
                    ) : (
                      <span>All toppings included</span>
                    )}
                    {upcharge > 0 && (
                      <span className="text-slate-500 tabular-nums dark:text-white/60">
                        Extras add {formatCurrency(upcharge)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {hasMods && (
                <div className="mt-3 space-y-1 text-[11px] tracking-[0.2em] text-slate-400 uppercase dark:text-white/50">
                  {removedSummary.length > 0 && (
                    <p>Hold: {formatListPreview(removedSummary)}</p>
                  )}
                  {addedSummary.length > 0 && (
                    <p>Add: {formatListPreview(addedSummary)}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-[6ch] text-lg font-semibold text-slate-900 tabular-nums dark:text-white">
              {formatCurrency(unitPrice)}
            </span>
            <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
              {cartItem && (
                <>
                  <button
                    type="button"
                    onClick={handleDecrement}
                    aria-label={`Remove one ${resolveSizeLabel(pizza, cartItem.size)} ${pizza.displayName} from cart`}
                    className="h-11 w-11 rounded-full border border-stone-300 bg-white text-lg text-slate-700 transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/30 dark:bg-white/15 dark:text-white dark:hover:bg-white/25 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
                  >
                    −
                  </button>
                  <span className="w-9 text-center text-sm font-semibold tracking-[0.2em] text-slate-600 dark:text-white/85">
                    {cartItem.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    aria-label={`Add one ${resolveSizeLabel(pizza, selectedSize)} ${pizza.displayName} to cart`}
                    className="h-11 w-11 rounded-full border border-red-600/70 bg-red-600 text-lg text-white transition hover:scale-[1.05] hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-red-400/60 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
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
                  aria-label={`Add ${pizza.displayName} to your order`}
                  className="group/cta relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-red-600 px-7 py-3 text-base font-semibold text-white shadow-xl shadow-red-600/40 transition hover:scale-[1.02] hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none sm:w-auto dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
                >
                  <ShoppingCart
                    className="h-5 w-5 transition-transform duration-200 group-hover/cta:-translate-y-0.5"
                    aria-hidden="true"
                  />
                  <span>{ctaLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export const PizzaCard = (props: PizzaCardProps) => (
  <PizzaCardInner {...props} key={props.pizza.id} />
);

if (import.meta.env.DEV) {
  Object.defineProperty(PizzaCard, 'displayName', {
    value: 'Station.PizzaLine',
  });
}
