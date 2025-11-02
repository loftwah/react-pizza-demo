import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Minus, Plus, Share2, Trash2, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import { z } from 'zod';
import { useCartStore, type CartItem } from '../stores/cart';
import { getPizzaById } from '../domain/menu';
import {
  formatCurrency,
  hydrateCustomizationDetails,
  normalizeCustomization,
  priceForConfiguration,
  sizeLabels,
} from '../domain/pizza';
import { useToast } from '../providers/toast-context';
import { useOrderHistory } from '../stores/orders';
import type { OrderLineItem, OrderRecord } from '../stores/orders';
import { OrderService } from '../services/order-service';
import { isFeatureEnabled } from '../config/features';
import { formatListPreview } from '../shared-utils/list-format';
import { LineItemCustomiser } from '../components/LineItemCustomiser';

type PersistedHistoryStore = typeof useOrderHistory & {
  persist?: {
    hasHydrated?: () => boolean;
  };
};

const checkoutFormSchema = z.object({
  customer: z.string().trim().min(1, 'Name is required.'),
  contact: z.string().trim().min(1, 'Contact details are required.'),
  instructions: z
    .string()
    .trim()
    .max(500, 'Instructions must be 500 characters or fewer.')
    .optional(),
});

const summarizeCustomization = (item: OrderLineItem) => {
  const removed = item.customization?.removedIngredients ?? [];
  const added =
    item.customization?.addedIngredients?.map((ingredient) =>
      ingredient.quantity > 1
        ? `${ingredient.name} ×${ingredient.quantity}`
        : ingredient.name,
    ) ?? [];
  const parts: string[] = [];
  if (removed.length > 0) {
    parts.push(`Hold: ${formatListPreview(removed)}`);
  }
  if (added.length > 0) {
    parts.push(`Add: ${formatListPreview(added)}`);
  }
  return parts.join(' • ');
};

const buildOrderSummary = (order: OrderRecord, shareLink?: string) => {
  const summaryLines = [
    `Order ${order.id}`,
    `Customer: ${order.customer}`,
    `Contact: ${order.contact}`,
    `Total: ${formatCurrency(order.total)}`,
    '',
    'Items:',
    ...order.items.map((item) => {
      const detail = summarizeCustomization(item);
      const customization = detail.length > 0 ? ` (${detail})` : '';
      return `${item.quantity}× ${item.sizeLabel.toLowerCase()} ${item.name}${customization} — ${formatCurrency(item.lineTotal)}`;
    }),
  ];
  if (shareLink) {
    summaryLines.push('', `Recreate this order: ${shareLink}`);
  }
  return summaryLines.join('\n');
};

const toInputString = (value: FormDataEntryValue | null) =>
  typeof value === 'string' ? value : value ? value.name : '';

export const CheckoutPageMobile = () => {
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.totalPrice());
  const addCartItem = useCartStore((state) => state.addItem);
  const decrementCartItem = useCartStore((state) => state.decrementItem);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const { showToast } = useToast();
  const orderHistory = useOrderHistory((state) => state.orders);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sharedOrderId = searchParams.get('order');
  const orderService = useMemo(() => new OrderService(), []);
  const ordersHydrated =
    (useOrderHistory as PersistedHistoryStore).persist?.hasHydrated?.() ?? true;

  const [isProcessing, setIsProcessing] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cartDetails = useMemo<OrderLineItem[]>(() => {
    return items
      .map((item) => {
        const pizza = getPizzaById(item.pizzaId);
        if (!pizza) return null;
        const customization = normalizeCustomization(item.customization);
        const { removed, added } = hydrateCustomizationDetails(
          pizza,
          customization,
        );
        const sizeLabel =
          pizza.sizeLabelsOverride?.[item.size] ?? sizeLabels[item.size];
        const unitPrice = priceForConfiguration(
          pizza,
          item.size,
          customization,
        );
        const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
        const customizationDetail =
          removed.length === 0 && added.length === 0
            ? undefined
            : {
                removedIngredients: removed,
                addedIngredients: added,
              };
        return {
          id: item.id,
          pizzaId: item.pizzaId,
          size: item.size,
          name: pizza.displayName,
          sizeLabel,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
          customization: customizationDetail,
          cartLineUid: item.lineUid,
        };
      })
      .filter((detail): detail is NonNullable<typeof detail> =>
        Boolean(detail),
      );
  }, [items]);

  const cartItemsById = useMemo(
    () =>
      new Map<string, CartItem>(items.map((item) => [item.id, item] as const)),
    [items],
  );

  useEffect(() => {
    if (!sharedOrderId || !ordersHydrated) return;
    const matchingOrder = orderHistory.find((order) => order.id === sharedOrderId);
    if (matchingOrder) {
      setSubmittedOrder(matchingOrder);
      showToast({
        message: `Loaded mock order ${matchingOrder.id}.`,
        tone: 'success',
      });
    } else {
      showToast({
        message: 'Shared order not found on this device.',
        tone: 'info',
      });
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('order');
    setSearchParams(nextParams, { replace: true });
  }, [
    sharedOrderId,
    ordersHydrated,
    orderHistory,
    searchParams,
    setSearchParams,
    showToast,
  ]);

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
    },
    [],
  );

  const handleIncrement = useCallback(
    (lineItem: OrderLineItem) => {
      const cartItem = cartItemsById.get(lineItem.id);
      if (!cartItem) return;
      addCartItem(cartItem.pizzaId, cartItem.size, cartItem.customization);
      showToast({
        message: `Added ${lineItem.name}`,
        tone: 'success',
      });
    },
    [addCartItem, cartItemsById, showToast],
  );

  const handleDecrement = useCallback(
    (lineItem: OrderLineItem) => {
      decrementCartItem(lineItem.id);
      showToast({
        message:
          lineItem.quantity <= 1
            ? `Removed ${lineItem.name}`
            : `Removed one ${lineItem.name}`,
        tone: 'info',
      });
    },
    [decrementCartItem, showToast],
  );

  const handleRemove = useCallback(
    (lineItem: OrderLineItem) => {
      removeCartItem(lineItem.id);
      showToast({
        message: `Cleared ${lineItem.name}`,
        tone: 'info',
      });
    },
    [removeCartItem, showToast],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;

      if (!items.length) {
        showToast({
          message: 'Cart is empty. Add pizzas before checking out.',
          tone: 'info',
        });
        navigate('/');
        return;
      }

      const formData = new FormData(form);
      const parsed = checkoutFormSchema.safeParse({
        customer: toInputString(formData.get('customer')),
        contact: toInputString(formData.get('contact')),
        instructions: (() => {
          const raw = toInputString(formData.get('instructions'));
          return raw.length > 0 ? raw : undefined;
        })(),
      });

      if (!parsed.success) {
        const firstIssue = parsed.error.issues.at(0);
        showToast({
          message:
            firstIssue?.message ??
            'Name and contact details are required to simulate checkout.',
          tone: 'error',
        });
        return;
      }

      setIsProcessing(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { customer, contact, instructions = '' } = parsed.data;
        const result = await orderService.run({
          customer,
          contact,
          instructions,
          cartDetails,
          cartTotal,
        });

        if (!result.ok) {
          showToast({
            message:
              result.error?.message ??
              'Something went wrong while preparing the order.',
            tone: 'error',
          });
          return;
        }

        const order = result.value;
        setSubmittedOrder(order);
        showToast({
          message: `Order ${order.id} queued.`,
          tone: 'success',
        });
        form.reset();

        if (result.degraded.length > 0) {
          result.degraded.forEach((step) => {
            showToast({
              message: `${step.step} reported an issue. Check console for details.`,
              tone: 'info',
            });
          });
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [cartDetails, cartTotal, items.length, navigate, orderService, showToast],
  );

  const shareLink = useMemo(() => {
    if (!submittedOrder || typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    url.searchParams.set('order', submittedOrder.id);
    return url.toString();
  }, [submittedOrder]);

  const copyToClipboard = useCallback(async (text: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('Clipboard is not available in this environment.');
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!successful) {
      throw new Error('Copy command is not supported.');
    }
  }, []);

  const handleShareOrder = useCallback(async () => {
    if (!submittedOrder || !shareLink) return;
    try {
      if (navigator.share && isFeatureEnabled('shareLinks')) {
        await navigator.share({ url: shareLink });
        return;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        showToast({
          message: 'Unable to open the share sheet. Link copied instead.',
          tone: 'info',
        });
      }
    }
    await copyToClipboard(shareLink);
    showToast({
      message: 'Share link copied to clipboard.',
      tone: 'success',
    });
  }, [copyToClipboard, shareLink, showToast, submittedOrder]);

  const handleCopySummary = useCallback(async () => {
    if (!submittedOrder) return;
    await copyToClipboard(buildOrderSummary(submittedOrder, shareLink ?? undefined));
    showToast({
      message: 'Order summary copied.',
      tone: 'success',
    });
  }, [copyToClipboard, shareLink, showToast, submittedOrder]);

  const stopVoice = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    if (!submittedOrder) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast({
        message: 'Voice mode needs a modern browser with speech support.',
        tone: 'info',
      });
      return;
    }
    if (isSpeaking) {
      stopVoice();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `Order ${submittedOrder.id} for ${submittedOrder.customer}. Total ${formatCurrency(
        submittedOrder.total,
      )}.`,
    );
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, stopVoice, submittedOrder, showToast]);

  const handleNewOrder = useCallback(() => {
    stopVoice();
    setSubmittedOrder(null);
    showToast({
      message: 'Ready for another mock order.',
      tone: 'info',
    });
  }, [showToast, stopVoice]);

  if (submittedOrder) {
    return (
      <section className="flex min-h-full flex-col gap-3 p-2">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Order #{submittedOrder.id}
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/70">
            Ready in approximately 12 minutes.
          </p>
        </header>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-white/10">
          {submittedOrder.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {item.quantity}× {item.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  {item.sizeLabel}
                </p>
                {item.customization && (
                  <p className="text-xs text-slate-400 dark:text-white/50">
                    {summarizeCustomization(item)}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatCurrency(item.lineTotal)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold dark:border-white/15">
            <span>Total</span>
            <span>{formatCurrency(submittedOrder.total)}</span>
          </div>
        </div>

        <div className="grid gap-3">
          {shareLink && (
            <button
              type="button"
              onClick={handleShareOrder}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-300 dark:focus-visible:ring-offset-neutral-950"
            >
              <Share2 className="h-4 w-4" />
              Share Order
            </button>
          )}
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/25 dark:focus-visible:ring-offset-neutral-950"
          >
            <Copy className="h-4 w-4" />
            Copy Summary
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/25 dark:focus-visible:ring-offset-neutral-950"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-4 w-4" />
                Stop Voice
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Play Voice Summary
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleNewOrder}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/25 dark:focus-visible:ring-offset-neutral-950"
          >
            Start Another Order
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-full flex-col gap-3 p-2">
      {cartDetails.length > 0 ? (
        <div className="space-y-3">
          {cartDetails.map((line) => (
            <div
              key={line.id}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/15 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {line.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/60">
                    {line.sizeLabel} • Qty {line.quantity}
                  </p>
                  {line.customization && (
                    <p className="text-xs text-slate-400 dark:text-white/50">
                      {summarizeCustomization(line)}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(line.lineTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement(line)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:opacity-50 dark:border-white/25 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15 dark:focus-visible:ring-white/25 dark:focus-visible:ring-offset-neutral-950"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleIncrement(line)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:opacity-50 dark:border-white/25 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15 dark:focus-visible:ring-white/25 dark:focus-visible:ring-offset-neutral-950"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(line)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-red-300/30 dark:bg-white/10 dark:text-red-300 dark:hover:bg-white/15 dark:focus-visible:ring-red-300/40 dark:focus-visible:ring-offset-neutral-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase text-red-500 dark:bg-red-500/20 dark:text-red-200">
                  {formatCurrency(line.unitPrice)} each
                </span>
              </div>
              <LineItemCustomiser item={line} />
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-base font-semibold shadow-sm dark:border-white/15 dark:bg-white/5">
            <span>Total</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-white/60">
          Cart empty —{' '}
          <Link
            to="/"
            className="font-semibold text-red-600 underline transition hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
          >
            add pizzas
          </Link>
          .
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="customer"
          placeholder="Name"
          required
          className="w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 shadow-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-red-300 dark:focus:ring-red-300/40"
        />
        <input
          name="contact"
          placeholder="Phone or email"
          required
          className="w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 shadow-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-red-300 dark:focus:ring-red-300/40"
        />
        <textarea
          name="instructions"
          placeholder="Special notes (optional)"
          rows={2}
          className="w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 shadow-sm transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-red-300 dark:focus:ring-red-300/40"
        />
        <button
          type="submit"
          disabled={isProcessing || cartDetails.length === 0}
          className={clsx(
            'w-full h-12 rounded-full text-sm font-semibold tracking-[0.2em] uppercase text-white transition focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-red-300 dark:focus-visible:ring-offset-neutral-950',
            isProcessing || cartDetails.length === 0
              ? 'bg-slate-400 dark:bg-slate-600'
              : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400',
          )}
        >
          {isProcessing ? 'Submitting…' : 'Submit Mock Order'}
        </button>
      </form>
    </section>
  );
};

export default CheckoutPageMobile;
