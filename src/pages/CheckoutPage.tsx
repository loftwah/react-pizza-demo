import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarPlus,
  Copy,
  FileDown,
  Minus,
  Mail,
  Plus,
  Printer,
  Share2,
  Trash2,
  Twitter,
  Volume2,
  VolumeX,
} from 'lucide-react';
import clsx from 'clsx';
import QRCode from 'qrcode';
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
import { isDevEnvironment } from '../shared-utils/env';
import { useOrderInsights } from '../hooks/useOrderInsights';

type PersistedHistoryStore = typeof useOrderHistory & {
  persist?: {
    hasHydrated?: () => boolean;
  };
};

const orderTimeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: 'numeric',
  minute: '2-digit',
});

const getMockReadyEta = () =>
  orderTimeFormatter.format(new Date(Date.now() + 18 * 60 * 1000));

const formatOrderTimestamp = (iso: string) =>
  orderTimeFormatter.format(new Date(iso));

const summarizeCustomization = (item: OrderLineItem): string => {
  const removed = item.customization?.removedIngredients ?? [];
  const added =
    item.customization?.addedIngredients?.map(
      (ingredient) => ingredient.name,
    ) ?? [];
  const parts: string[] = [];
  if (removed.length > 0) {
    parts.push(`Hold: ${removed.join(', ')}`);
  }
  if (added.length > 0) {
    parts.push(`Add: ${added.join(', ')}`);
  }
  return parts.join(' • ');
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

export const CheckoutPage = () => {
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.totalPrice());
  const cartCount = useCartStore((state) => state.totalItems());
  const addCartItem = useCartStore((state) => state.addItem);
  const decrementCartItem = useCartStore((state) => state.decrementItem);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const { showToast } = useToast();
  const clearOrderHistory = useOrderHistory((state) => state.clearOrders);
  const orderHistory = useOrderHistory((state) => state.orders);
  const { summary: orderSummary, recentOrders } = useOrderInsights({
    recentLimit: 5,
  });
  const navigate = useNavigate();
  const orderService = useMemo(() => new OrderService(), []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(
    null,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1.05);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const voiceStopRequestedRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const sharedOrderId = searchParams.get('order');
  const ordersHydrated =
    (useOrderHistory as PersistedHistoryStore).persist?.hasHydrated?.() ?? true;

  const cartDetails = useMemo<OrderLineItem[]>(() => {
    const detail = items
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
        };
      })
      .filter((detail): detail is NonNullable<typeof detail> =>
        Boolean(detail),
      );
    return detail;
  }, [items]);
  const cartItemsById = useMemo(
    () =>
      new Map<string, CartItem>(
        items.map((item) => [item.id, item] as const),
      ),
    [items],
  );
  const handleIncrementCartItem = useCallback(
    (lineItem: OrderLineItem) => {
      const cartItem = cartItemsById.get(lineItem.id);
      if (!cartItem) return;
      addCartItem(cartItem.pizzaId, cartItem.size, cartItem.customization);
      showToast({
        message: `Added another ${lineItem.sizeLabel} ${lineItem.name}`,
        tone: 'success',
      });
    },
    [addCartItem, cartItemsById, showToast],
  );
  const handleDecrementCartItem = useCallback(
    (lineItem: OrderLineItem) => {
      decrementCartItem(lineItem.id);
      showToast({
        message:
          lineItem.quantity <= 1
            ? `Removed ${lineItem.name} from your cart`
            : `Removed one ${lineItem.sizeLabel} ${lineItem.name}`,
        tone: 'info',
      });
    },
    [decrementCartItem, showToast],
  );
  const handleRemoveCartItem = useCallback(
    (lineItem: OrderLineItem) => {
      removeCartItem(lineItem.id);
      showToast({
        message: `Cleared ${lineItem.sizeLabel} ${lineItem.name} from your cart`,
        tone: 'info',
      });
    },
    [removeCartItem, showToast],
  );
  const hasCart = cartDetails.length > 0;
  const formattedTotal = formatCurrency(cartTotal);
  const formattedCount = cartCount.toString().padStart(2, '0');
  const mockReadyEta = useMemo(() => {
    if (!hasCart || cartCount <= 0) {
      return '—';
    }
    return getMockReadyEta();
  }, [hasCart, cartCount]);
  const historyPreview = useMemo(
    () => recentOrders.slice(0, 3),
    [recentOrders],
  );
  const sidebarRecentOrders = useMemo(
    () => recentOrders.slice(0, 4),
    [recentOrders],
  );
  const shareLink = useMemo(() => {
    if (!submittedOrder || typeof window === 'undefined') return null;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('order', submittedOrder.id);
    return shareUrl.toString();
  }, [submittedOrder]);
  const historyButtonClass =
    'rounded-full border border-slate-200/70 bg-white px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-slate-500 uppercase transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950';

  useEffect(() => {
    if (!sharedOrderId || !ordersHydrated) return;
    const matchingOrder = orderHistory.find(
      (order) => order.id === sharedOrderId,
    );
    if (matchingOrder) {
      setSubmittedOrder(matchingOrder);
      showToast({
        message: `Loaded mock order ${matchingOrder.id} from history.`,
        tone: 'success',
      });
    } else {
      showToast({
        message:
          'Shared order not found on this device. Create it once to access the summary directly.',
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

  useEffect(() => {
    let cancelled = false;
    if (!shareLink || !isFeatureEnabled('shareLinks')) {
      setQrCodeDataUrl(null);
      return undefined;
    }
    QRCode.toDataURL(shareLink, { margin: 1, width: 160 })
      .then((url: string) => {
        if (!cancelled) {
          setQrCodeDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeDataUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shareLink]);

  const handleClearHistory = useCallback(() => {
    clearOrderHistory();
    showToast({
      message: 'Mock order history cleared.',
      tone: 'info',
    });
  }, [clearOrderHistory, showToast]);

  const stopVoicePlayback = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      voiceStopRequestedRef.current = true;
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  const handleResetSubmittedOrder = useCallback(() => {
    stopVoicePlayback();
    setSubmittedOrder(null);
    setVoiceRate(1.05);
    showToast({
      message:
        'Ready for another mock order—head back to the menu to add pizzas.',
      tone: 'info',
    });
  }, [setSubmittedOrder, setVoiceRate, showToast, stopVoicePlayback]);

  const handleViewOrderRecord = useCallback(
    (order: OrderRecord) => {
      stopVoicePlayback();
      setSubmittedOrder(order);
      setVoiceRate(1.05);
      showToast({
        message: `Viewing mock order ${order.id}.`,
        tone: 'info',
      });
    },
    [setSubmittedOrder, setVoiceRate, showToast, stopVoicePlayback],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;

      if (!items.length) {
        showToast({
          message: 'Your cart is empty. Add pizzas before checking out.',
          tone: 'info',
        });
        navigate('/');
        return;
      }

      const formData = new FormData(form);
      const toInputString = (value: FormDataEntryValue | null) =>
        typeof value === 'string' ? value : value ? value.name : '';

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

      const { customer, contact, instructions = '' } = parsed.data;

      setIsProcessing(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 750));

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
          if (isDevEnvironment()) {
            console.table(result.timeline);
          }
          return;
        }

        const order = result.value;
        setSubmittedOrder(order);
        showToast({
          message: `Order ${order.id} queued for the oven — check your summary below.`,
          tone: 'success',
        });

        if (result.degraded.length > 0) {
          result.degraded.forEach((step) => {
            showToast({
              message: `${step.step} reported: ${
                step.error?.message ?? 'check developer console for details.'
              }`,
              tone: 'info',
            });
          });
        }

        if (isDevEnvironment()) {
          console.table(result.timeline);
        }

        form.reset();
      } finally {
        setIsProcessing(false);
      }
    },
    [cartDetails, cartTotal, items.length, navigate, orderService, showToast],
  );

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
    },
    [],
  );

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

  const copyOrderRecord = useCallback(
    async (order: OrderRecord) => {
      try {
        const formatted = JSON.stringify(order, null, 2);
        await copyToClipboard(formatted);
        showToast({
          message: `Order ${order.id} copied — ready to drop into docs.`,
          tone: 'success',
        });
      } catch (error) {
        showToast({
          message:
            error instanceof Error
              ? error.message
              : 'Unable to copy order details.',
          tone: 'error',
        });
      }
    },
    [copyToClipboard, showToast],
  );

  const handleCopyOrderJson = useCallback(() => {
    if (!submittedOrder) return;
    void copyOrderRecord(submittedOrder);
  }, [copyOrderRecord, submittedOrder]);

  const handleShareOrder = useCallback(async () => {
    if (!submittedOrder || !shareLink || typeof window === 'undefined') return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Loftwah Pizza Order ${submittedOrder.id}`,
          text: 'Recreate this mock order in Loftwah Pizza.',
          url: shareLink,
        });
        showToast({
          message: 'Share sheet opened — send that mock order on!',
          tone: 'success',
        });
        return;
      }
      await copyToClipboard(shareLink);
      showToast({
        message: 'Share link copied. Paste it anywhere you demo.',
        tone: 'success',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      showToast({
        message:
          error instanceof Error
            ? error.message
            : 'Sharing is not available on this device.',
        tone: 'error',
      });
    }
  }, [copyToClipboard, shareLink, showToast, submittedOrder]);

  const handleEmailReceipt = useCallback(() => {
    if (!submittedOrder || typeof window === 'undefined') return;
    const subject = encodeURIComponent(
      `Loftwah Pizza Order ${submittedOrder.id}`,
    );
    const summaryLines = [
      `Order: ${submittedOrder.id}`,
      `Customer: ${submittedOrder.customer}`,
      `Contact: ${submittedOrder.contact}`,
      `Total: ${formatCurrency(submittedOrder.total)}`,
      '',
      'Items:',
      ...submittedOrder.items.map((item) => {
        const summary = summarizeCustomization(item);
        const detail =
          summary.length > 0 ? ` (${summary.replaceAll(' • ', '; ')})` : '';
        return `${item.quantity}× ${item.sizeLabel.toLowerCase()} ${item.name}${detail} (${formatCurrency(item.lineTotal)})`;
      }),
    ];
    if (shareLink) {
      summaryLines.push('', `Recreate this order: ${shareLink}`);
    }
    const body = encodeURIComponent(summaryLines.join('\n'));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [shareLink, submittedOrder]);

  const handleTweetOrder = useCallback(() => {
    if (!submittedOrder || typeof window === 'undefined') return;
    const text = encodeURIComponent(
      `Order ${submittedOrder.id} is staged at Loftwah Pizza. Ready in about 18 minutes!`,
    );
    const urlParam = shareLink ? `&url=${encodeURIComponent(shareLink)}` : '';
    const tweetUrl = `https://twitter.com/intent/tweet?text=${text}${urlParam}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  }, [shareLink, submittedOrder]);

  const handleAddToCalendar = useCallback(() => {
    if (!submittedOrder || typeof window === 'undefined') return;

    const createdAt = new Date(submittedOrder.createdAt);
    const readyStart = new Date(createdAt.getTime() + 18 * 60 * 1000);
    const readyEnd = new Date(readyStart.getTime() + 20 * 60 * 1000);
    const formatDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const descriptionLines = [
      `Contact: ${submittedOrder.contact}`,
      `Total: ${formatCurrency(submittedOrder.total)}`,
      'Items:',
      ...submittedOrder.items.map((item) => {
        const summary = summarizeCustomization(item);
        const detail =
          summary.length > 0 ? ` (${summary.replaceAll(' • ', '; ')})` : '';
        return `${item.quantity}× ${item.sizeLabel} ${item.name}${detail}`;
      }),
    ];
    if (shareLink) {
      descriptionLines.push('', `Recreate: ${shareLink}`);
    }

    const icsPayload = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Loftwah Pizza//Order Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${submittedOrder.id}@loftwah.pizza`,
      `DTSTAMP:${formatDate(createdAt)}`,
      `DTSTART:${formatDate(readyStart)}`,
      `DTEND:${formatDate(readyEnd)}`,
      `SUMMARY:Pickup ${submittedOrder.customer}'s order`,
      `DESCRIPTION:${descriptionLines.join('\\n')}`,
      'LOCATION:Loftwah Pizza Demo Store',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsPayload], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `loftwah-pizza-${submittedOrder.id}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast({
      message: 'Calendar invite downloaded — drop it into your schedule.',
      tone: 'success',
    });
  }, [shareLink, showToast, submittedOrder]);

  const handlePrintReceipt = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.print();
  }, []);

  const handleSaveAsPdf = useCallback(() => {
    handlePrintReceipt();
    showToast({
      message: 'Choose “Save as PDF” in the print dialog to export a copy.',
      tone: 'info',
    });
  }, [handlePrintReceipt, showToast]);

  const handleVoiceSpeedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setVoiceRate(Number(event.target.value));
    },
    [],
  );

  const handleVoicePlayback = useCallback(() => {
    if (!submittedOrder || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      showToast({
        message: 'Voice mode needs a modern browser with speech support.',
        tone: 'info',
      });
      return;
    }
    const { speechSynthesis } = window;
    if (isSpeaking) {
      voiceStopRequestedRef.current = true;
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    voiceStopRequestedRef.current = false;
    const itemSummary =
      submittedOrder.items.length > 0
        ? submittedOrder.items
            .map((item) => {
              const summary = summarizeCustomization(item);
              const speechMods =
                summary.length > 0
                  ? summary
                      .split(' • ')
                      .map((part) =>
                        part.replace('Hold:', 'hold').replace('Add:', 'add'),
                      )
                      .join(', ')
                  : '';
              const modSuffix = speechMods ? ` (${speechMods})` : '';
              return `${item.quantity} ${item.sizeLabel.toLowerCase()} ${item.name}${modSuffix}`;
            })
            .join(', ')
        : 'no pizzas selected';
    const spokenSummary = [
      `Order ${submittedOrder.id} for ${submittedOrder.customer}.`,
      `Contact: ${submittedOrder.contact}.`,
      `Items: ${itemSummary}.`,
      `Total comes to ${formatCurrency(submittedOrder.total)}.`,
    ].join(' ');

    const utterance = new SpeechSynthesisUtterance(spokenSummary);
    utterance.rate = voiceRate;
    utterance.pitch = 1.05;
    utterance.onend = () => {
      voiceStopRequestedRef.current = false;
      setIsSpeaking(false);
    };
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      setIsSpeaking(false);
      if (
        voiceStopRequestedRef.current ||
        event.error === 'interrupted' ||
        event.error === 'canceled'
      ) {
        voiceStopRequestedRef.current = false;
        return;
      }
      showToast({
        message: 'Voice playback hit a snag.',
        tone: 'error',
      });
    };

    setIsSpeaking(true);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, [isSpeaking, showToast, submittedOrder, voiceRate]);

  const actionButtonBase =
    'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.3em] uppercase transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950';
  const itemActionButtonBase =
    'inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold tracking-[0.25em] uppercase text-slate-600 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/25 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950';

  if (submittedOrder) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 sm:px-6">
        <header className="space-y-3 text-center lg:text-left">
          <p className="text-xs font-semibold tracking-[0.35em] text-red-500 uppercase dark:text-red-200/80">
            Simulated service complete
          </p>
          <h1 className="font-display text-4xl leading-tight text-slate-900 dark:text-white">
            Order {submittedOrder.id} is staged for pickup
          </h1>
          <p className="text-sm text-slate-600 dark:text-white/70">
            Use this summary in your documentation or onboarding
            flows—everything here lives purely in the front-end, ready for
            storytelling.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <article className="print-area print-stack space-y-6 rounded-[2.5rem] border border-stone-200/70 bg-white/80 p-6 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.2)] sm:p-8 dark:border-white/15 dark:bg-white/10">
            <div className="flex flex-col gap-2">
              <span className="text-xs tracking-[0.35em] text-slate-400 uppercase dark:text-white/40">
                Order reference
              </span>
              <h2 className="font-display text-3xl text-slate-900 dark:text-white">
                #{submittedOrder.id}
              </h2>
              <p className="text-sm text-slate-500 dark:text-white/70">
                We&apos;ll have this mock order &ldquo;ready&rdquo; in about 12
                minutes. Copy the details below for your notes or walkthroughs.
              </p>
            </div>
            <div className="print-hidden grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {isFeatureEnabled('shareLinks') && (
                <button
                  type="button"
                  onClick={handleShareOrder}
                  className={clsx(
                    actionButtonBase,
                    'w-full border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 focus-visible:ring-red-300 dark:border-red-200/40 dark:bg-red-500/15 dark:text-red-100 dark:hover:bg-red-500/25 dark:focus-visible:ring-red-300/80',
                  )}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Share link</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyOrderJson}
                className={clsx(
                  actionButtonBase,
                  'w-full border-slate-200/70 bg-white/80 text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/30',
                )}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Copy JSON</span>
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className={clsx(
                  actionButtonBase,
                  'w-full border-slate-200/70 bg-white/80 text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/30',
                )}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                <span>Print receipt</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAsPdf}
                className={clsx(
                  actionButtonBase,
                  'w-full border-slate-200/70 bg-white/80 text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/30',
                )}
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                <span>Save as PDF</span>
              </button>
              <button
                type="button"
                onClick={handleEmailReceipt}
                className={clsx(
                  actionButtonBase,
                  'w-full border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 focus-visible:ring-red-300 dark:border-red-200/40 dark:bg-red-500/15 dark:text-red-100 dark:hover:bg-red-500/25 dark:focus-visible:ring-red-300/80',
                )}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>Email receipt</span>
              </button>
              <button
                type="button"
                onClick={handleTweetOrder}
                className={clsx(
                  actionButtonBase,
                  'w-full border-slate-200/70 bg-white/80 text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300 dark:border-white/20 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/30',
                )}
              >
                <Twitter className="h-4 w-4" aria-hidden="true" />
                <span>Tweet this</span>
              </button>
              <button
                type="button"
                onClick={handleAddToCalendar}
                className={clsx(
                  actionButtonBase,
                  'w-full border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 focus-visible:ring-emerald-300 dark:border-emerald-300/40 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/25 dark:focus-visible:ring-emerald-200/70',
                )}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                <span>Add to calendar</span>
              </button>
              {isFeatureEnabled('voiceMode') && (
                <button
                  type="button"
                  onClick={handleVoicePlayback}
                  aria-pressed={isSpeaking}
                  className={clsx(
                    actionButtonBase,
                    'w-full border-emerald-500/40 focus-visible:ring-emerald-300 dark:border-emerald-300/40 dark:focus-visible:ring-emerald-200/70',
                    isSpeaking
                      ? 'bg-emerald-500 text-white hover:bg-emerald-500 dark:bg-emerald-400 dark:text-slate-900'
                      : 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25',
                  )}
                >
                  {isSpeaking ? (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{isSpeaking ? 'Stop voice' : 'Voice mode'}</span>
                </button>
              )}
            </div>

            {isFeatureEnabled('voiceMode') && (
              <div className="print-hidden rounded-2xl border border-stone-200/70 bg-white/70 p-4 text-xs tracking-[0.3em] text-slate-500 dark:border-white/15 dark:bg-white/10 dark:text-white/60">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                    Voice speed
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.8"
                      max="1.4"
                      step="0.05"
                      value={voiceRate}
                      onChange={handleVoiceSpeedChange}
                      aria-label="Adjust voice speed"
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-red-500 dark:bg-white/20"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-white/70">
                      {voiceRate.toFixed(2)}×
                    </span>
                  </div>
                </label>
              </div>
            )}

            {isFeatureEnabled('shareLinks') && qrCodeDataUrl && (
              <div className="print-hidden flex flex-col gap-3 rounded-2xl border border-stone-200/70 bg-white/80 p-4 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left dark:border-white/15 dark:bg-white/10">
                <img
                  src={qrCodeDataUrl}
                  alt={`QR code for order ${submittedOrder?.id ?? ''}`}
                  className="mx-auto h-28 w-28 rounded-2xl border border-stone-200/70 bg-white/90 p-2 sm:mx-0 dark:border-white/15 dark:bg-white/10"
                />
                <div className="flex flex-1 flex-col gap-3 text-sm text-slate-600 dark:text-white/70">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                      Demo quick share
                    </span>
                    <p>
                      Scan this QR code on another device to recreate the order
                      instantly, or copy the link for later.
                    </p>
                  </div>
                  {shareLink && (
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(shareLink)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 py-2 text-[11px] font-semibold tracking-[0.3em] text-slate-600 uppercase transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy link
                    </button>
                  )}
                </div>
              </div>
            )}

            <dl className="grid gap-5 text-sm text-slate-600 sm:grid-cols-2 dark:text-white/70">
              <div>
                <dt className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                  Customer
                </dt>
                <dd className="mt-1 text-base text-slate-900 dark:text-white">
                  {submittedOrder.customer}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                  Contact
                </dt>
                <dd className="mt-1 text-base text-slate-900 dark:text-white">
                  {submittedOrder.contact}
                </dd>
              </div>
              {submittedOrder.instructions && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                    Special instructions
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-white/70">
                    {submittedOrder.instructions}
                  </dd>
                </div>
              )}
            </dl>

            <div className="space-y-4">
              <h3 className="font-display text-xl text-slate-900 dark:text-white">
                Line items
              </h3>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-white/70">
                {submittedOrder.items.map((item) => {
                  const customizationSummary = summarizeCustomization(item);
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/15 dark:bg-white/5"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                          {item.sizeLabel} • Qty {item.quantity} •{' '}
                          {formatCurrency(item.unitPrice)}
                        </p>
                        {customizationSummary && (
                          <p className="text-[11px] tracking-[0.25em] text-slate-400 uppercase dark:text-white/45">
                            {customizationSummary}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(item.lineTotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-200/40 dark:bg-red-500/15 dark:text-red-100">
                <span>Total</span>
                <span>{formatCurrency(submittedOrder.total)}</span>
              </div>
            </div>
          </article>

          <aside className="print-hidden flex flex-col justify-between gap-6 rounded-[2.5rem] border border-stone-200/70 bg-white/60 p-6 text-sm text-slate-600 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.25)] sm:p-8 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <div className="space-y-5">
              {orderSummary.totalOrders > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold tracking-[0.35em] text-slate-400 uppercase dark:text-white/40">
                    Recent mock orders
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {sidebarRecentOrders.map((order) => (
                      <li
                        key={order.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/70 px-4 py-3 dark:border-white/15 dark:bg-white/10"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            #{order.id}
                          </p>
                          <p className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                            {order.items.length} items •{' '}
                            {formatOrderTimestamp(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(order.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleViewOrderRecord(order)}
                            className={`${historyButtonClass} whitespace-nowrap`}
                          >
                            View summary
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyOrderRecord(order)}
                            className={`${historyButtonClass} whitespace-nowrap`}
                          >
                            Copy JSON
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <h2 className="font-display text-2xl text-slate-900 dark:text-white">
                What to do with this?
              </h2>
              <p>
                Drop this confirmation into screenshots, walkthrough videos, or
                onboarding docs. Because it never leaves the browser, you can
                reset and repeat as often as you like.
              </p>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 text-xs tracking-[0.3em] text-slate-400 uppercase dark:border-white/15 dark:bg-white/10 dark:text-white/40">
                <span>Cart cleared for next run</span>
                <span>Great for pairing demos</span>
                <span>Zero backend dependencies</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-center sm:text-left">
              <button
                type="button"
                onClick={handleResetSubmittedOrder}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2 text-xs font-semibold tracking-[0.3em] text-white uppercase transition hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950"
              >
                Run another mock order
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-xs font-semibold tracking-[0.3em] text-slate-700 uppercase transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/25 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
              >
                Back to menu
              </Link>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 sm:px-6">
      <header className="space-y-3 text-center lg:text-left">
        <p className="text-xs font-semibold tracking-[0.35em] text-slate-400 uppercase dark:text-white/40">
          Mock checkout flow
        </p>
        <h1 className="font-display text-4xl leading-tight text-slate-900 dark:text-white">
          Stage a demo order in seconds
        </h1>
        <p className="text-sm text-slate-600 dark:text-white/70">
          Capture the full “order complete” story without calling a backend.
          Fill in the basics, press submit, and we&apos;ll hand you a polished
          summary.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <article className="flex flex-col gap-6 rounded-[2.5rem] border border-stone-200/70 bg-white/80 p-8 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.2)] dark:border-white/15 dark:bg-white/10">
          <div className="flex flex-col gap-2">
            <span className="text-xs tracking-[0.35em] text-slate-400 uppercase dark:text-white/40">
              Cart snapshot
            </span>
            <h2 className="font-display text-3xl text-slate-900 dark:text-white">
              {hasCart ? formattedTotal : 'Cart is empty'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-white/70">
              {hasCart
                ? `You have ${formattedCount} ${cartCount === 1 ? 'pizza' : 'pizzas'} ready to stage.`
                : 'Head back to the menu, add a few pizzas, then return to preview the checkout.'}
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-stone-200/70 bg-white/60 px-5 py-4 text-xs tracking-[0.3em] text-slate-400 uppercase sm:grid-cols-3 dark:border-white/15 dark:bg-white/10 dark:text-white/40">
            <div className="flex flex-col gap-1">
              <span>Status</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {hasCart ? 'Ready to submit' : 'Waiting for items'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span>Items</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formattedCount}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span>Ready by</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {mockReadyEta}
              </span>
            </div>
          </div>

          {hasCart ? (
            <>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-white/70">
                {cartDetails.map((item) => {
                  const customizationSummary = summarizeCustomization(item);
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/15 dark:bg-white/5"
                    >
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                          {item.sizeLabel} • Qty {item.quantity} •{' '}
                          {formatCurrency(item.unitPrice)}
                        </p>
                        {customizationSummary && (
                          <p className="text-[11px] tracking-[0.25em] text-slate-400 uppercase dark:text-white/45">
                            {customizationSummary}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleDecrementCartItem(item)}
                            className={itemActionButtonBase}
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {item.quantity <= 1 ? 'Remove item' : 'Remove one'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleIncrementCartItem(item)}
                            className={itemActionButtonBase}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Add one</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(item)}
                            className={itemActionButtonBase}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Remove all</span>
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(item.lineTotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 py-4 text-xs tracking-[0.3em] text-slate-500 uppercase dark:border-white/20 dark:bg-white/5 dark:text-white/60">
                <span>Need to tweak your order?</span>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-[11px] font-semibold tracking-[0.35em] text-slate-700 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/25 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
                >
                  Continue ordering
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center text-xs tracking-[0.3em] text-slate-400 uppercase dark:border-white/20 dark:bg-white/5 dark:text-white/40">
              <span>Cart is empty</span>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-[11px] font-semibold tracking-[0.35em] text-slate-700 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/25 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
              >
                Browse menu
              </Link>
            </div>
          )}

          {hasCart && (
            <div className="flex items-center justify-between rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-200/40 dark:bg-red-500/15 dark:text-red-100">
              <span>Total</span>
              <span>{formattedTotal}</span>
            </div>
          )}

          {orderSummary.totalOrders > 0 && (
            <div className="space-y-3 rounded-2xl border border-stone-200/70 bg-white/60 px-5 py-4 text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
              <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                <span>Mock order history</span>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-slate-600 uppercase transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/25 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
                >
                  Clear
                </button>
              </div>
              <div className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-[11px] tracking-[0.3em] text-slate-500 uppercase sm:grid-cols-3 dark:border-white/15 dark:bg-white/10 dark:text-white/50">
                <div className="flex flex-col gap-1">
                  <span>Total orders</span>
                  <span className="text-sm font-semibold tracking-normal text-slate-800 dark:text-white">
                    {orderSummary.totalOrders.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span>Lifetime revenue</span>
                  <span className="text-sm font-semibold tracking-normal text-slate-800 dark:text-white">
                    {formatCurrency(orderSummary.totalRevenue)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span>Latest kitchen ref</span>
                  <span className="font-mono text-sm tracking-normal text-slate-800 dark:text-white">
                    {orderSummary.latestSubmission?.submission
                      ?.kitchenReference ?? 'Pending'}
                  </span>
                </div>
              </div>
              <ul className="space-y-2">
                {historyPreview.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 dark:border-white/15 dark:bg-white/10"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        #{order.id}
                      </p>
                      <p className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                        {order.items.length} items •{' '}
                        {formatOrderTimestamp(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(order.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewOrderRecord(order)}
                        className={`${historyButtonClass} whitespace-nowrap`}
                      >
                        View summary
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyOrderRecord(order)}
                        className={`${historyButtonClass} whitespace-nowrap`}
                      >
                        Copy JSON
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {orderSummary.totalOrders > 3 && (
                <p className="text-[11px] tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                  Showing latest 3 of {orderSummary.totalOrders}
                </p>
              )}
            </div>
          )}
        </article>

        <form
          className="flex flex-col gap-6 rounded-[2.5rem] border border-stone-200/70 bg-white/80 p-8 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.25)] dark:border-white/15 dark:bg-white/10"
          onSubmit={handleSubmit}
          noValidate
          aria-describedby="checkout-helper"
        >
          <div className="space-y-2">
            <span className="text-xs tracking-[0.35em] text-slate-400 uppercase dark:text-white/40">
              Mock customer details
            </span>
            <h2 className="font-display text-2xl text-slate-900 dark:text-white">
              Who&apos;s picking this up?
            </h2>
            <p className="text-sm text-slate-600 dark:text-white/70">
              Use realistic names so your screenshots feel authentic. Nothing
              here saves to a server.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
              <span className="text-xs tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                Name
              </span>
              <input
                type="text"
                name="customer"
                autoComplete="name"
                required
                className="rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus:border-red-300 dark:focus:ring-red-400/30"
                placeholder="Ada Lovelace"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
              <span className="text-xs tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                Contact method
              </span>
              <input
                type="text"
                name="contact"
                autoComplete="tel"
                required
                className="rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus:border-red-300 dark:focus:ring-red-400/30"
                placeholder="Phone or email"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
            <span className="text-xs tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
              Pickup instructions
            </span>
            <textarea
              name="instructions"
              rows={4}
              className="rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white dark:focus:border-red-300 dark:focus:ring-red-400/30"
              placeholder="Parking out front, call when you arrive..."
            />
          </label>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/60 px-5 py-4 text-xs text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-white/60">
            <p id="checkout-helper">
              Submitting creates a shareable confirmation. We immediately clear
              the cart so you can run again for another persona or scenario.
            </p>
            <p className="text-[11px] tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
              No external API calls • Everything stays client-side
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-xs font-semibold tracking-[0.3em] text-slate-700 uppercase transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:border-white/25 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15 dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-neutral-950"
            >
              Continue browsing
            </Link>
            <button
              type="submit"
              disabled={isProcessing || !hasCart}
              className={clsx(
                'inline-flex items-center justify-center rounded-full bg-red-600 px-7 py-3 text-xs font-semibold tracking-[0.35em] text-white uppercase transition hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-neutral-950',
                (isProcessing || !hasCart) && 'opacity-70',
              )}
            >
              {isProcessing ? 'Sending to the oven…' : 'Submit mock order'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

if (import.meta.env.DEV) {
  Object.defineProperty(CheckoutPage, 'displayName', {
    value: 'Station.CheckoutBay',
  });
}
