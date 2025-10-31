import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useCartStore } from '../stores/cart';
import { getPizzaById } from '../domain/menu';
import { formatCurrency, priceForSize, sizeLabels } from '../domain/pizza';
import { useToast } from '../providers/toast-context';
import { useOrderHistory } from '../stores/orders';
import type { OrderLineItem, OrderRecord } from '../stores/orders';

const orderTimeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: 'numeric',
  minute: '2-digit',
});

const getMockReadyEta = () =>
  orderTimeFormatter.format(new Date(Date.now() + 18 * 60 * 1000));

const formatOrderTimestamp = (iso: string) =>
  orderTimeFormatter.format(new Date(iso));

const generateOrderNumber = () =>
  `LP-${Date.now().toString(36).toUpperCase().slice(-5)}`;

export const CheckoutPage = () => {
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.totalPrice());
  const cartCount = useCartStore((state) => state.totalItems());
  const clearCart = useCartStore((state) => state.clear);
  const { showToast } = useToast();
  const orderHistory = useOrderHistory((state) => state.orders);
  const addOrder = useOrderHistory((state) => state.addOrder);
  const clearOrderHistory = useOrderHistory((state) => state.clearOrders);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(
    null,
  );

  const cartDetails = useMemo<OrderLineItem[]>(() => {
    const detail = items
      .map((item) => {
        const pizza = getPizzaById(item.pizzaId);
        if (!pizza) return null;
        const sizeLabel = sizeLabels[item.size];
        const pricePerUnit = priceForSize(pizza, item.size);
        const lineTotal = Math.round(pricePerUnit * item.quantity * 100) / 100;
        return {
          id: item.id,
          name: pizza.displayName,
          sizeLabel,
          quantity: item.quantity,
          unitPrice: pricePerUnit,
          lineTotal,
        };
      })
      .filter((detail): detail is NonNullable<typeof detail> =>
        Boolean(detail),
      );
    return detail;
  }, [items]);
  const hasCart = cartDetails.length > 0;
  const formattedTotal = formatCurrency(cartTotal);
  const formattedCount = cartCount.toString().padStart(2, '0');
  const mockReadyEta = useMemo(() => getMockReadyEta(), [cartCount, hasCart]);
  const historyPreview = orderHistory.slice(0, 3);

  const handleClearHistory = useCallback(() => {
    clearOrderHistory();
    showToast({
      message: 'Mock order history cleared.',
      tone: 'info',
    });
  }, [clearOrderHistory, showToast]);

  const handleResetSubmittedOrder = useCallback(() => {
    setSubmittedOrder(null);
    showToast({
      message:
        'Ready for another mock order—head back to the menu to add pizzas.',
      tone: 'info',
    });
  }, [setSubmittedOrder, showToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length) {
      showToast({
        message: 'Your cart is empty. Add pizzas before checking out.',
        tone: 'info',
      });
      navigate('/');
      return;
    }
    const formData = new FormData(event.currentTarget);
    const customer = (formData.get('customer') as string)?.trim();
    const contact = (formData.get('contact') as string)?.trim();
    const instructions = (formData.get('instructions') as string)?.trim();

    if (!customer || !contact) {
      showToast({
        message: 'Name and contact details are required to simulate checkout.',
        tone: 'error',
      });
      return;
    }

    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 750));

    const orderId = generateOrderNumber();
    const newOrder: OrderRecord = {
      id: orderId,
      customer,
      contact,
      instructions,
      total: cartTotal,
      createdAt: new Date().toISOString(),
      items: cartDetails.map((item) => ({ ...item })),
    };
    setSubmittedOrder(newOrder);
    addOrder(newOrder);
    clearCart();
    showToast({
      message: `Order ${orderId} queued for the oven — check your summary below.`,
      tone: 'success',
    });
    setIsProcessing(false);
    event.currentTarget.reset();
  };

  if (submittedOrder) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-3 text-center lg:text-left">
          <p className="text-brand-500 dark:text-brand-200/80 text-xs font-semibold tracking-[0.35em] uppercase">
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
          <article className="space-y-6 rounded-[2.5rem] border border-stone-200/70 bg-white/80 p-8 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.2)] dark:border-white/15 dark:bg-white/10">
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
                {submittedOrder.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/15 dark:bg-white/5"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                        {item.sizeLabel} • Qty {item.quantity} •{' '}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-brand-500/40 bg-brand-500/10 text-brand-700 dark:border-brand-200/40 dark:bg-brand-500/15 dark:text-brand-100 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(submittedOrder.total)}</span>
              </div>
            </div>
          </article>

          <aside className="flex flex-col justify-between gap-6 rounded-[2.5rem] border border-stone-200/70 bg-white/60 p-8 text-sm text-slate-600 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <div className="space-y-5">
              {orderHistory.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold tracking-[0.35em] text-slate-400 uppercase dark:text-white/40">
                    Recent mock orders
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {orderHistory.slice(0, 4).map((order) => (
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
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(order.total)}
                        </span>
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
                className="bg-brand-500 hover:bg-brand-400 focus-visible:ring-brand-200 dark:hover:bg-brand-400/90 dark:focus-visible:ring-brand-400 inline-flex items-center justify-center rounded-full px-6 py-2 text-xs font-semibold tracking-[0.3em] text-white uppercase transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950"
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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10">
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
                {hasCart ? mockReadyEta : '—'}
              </span>
            </div>
          </div>

          {hasCart ? (
            <ul className="space-y-3 text-sm text-slate-600 dark:text-white/70">
              {cartDetails.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/15 dark:bg-white/5"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-xs tracking-[0.25em] text-slate-400 uppercase dark:text-white/40">
                      {item.sizeLabel} • Qty {item.quantity} •{' '}
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
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
            <div className="border-brand-500/40 bg-brand-500/10 text-brand-700 dark:border-brand-200/40 dark:bg-brand-500/15 dark:text-brand-100 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold">
              <span>Total</span>
              <span>{formattedTotal}</span>
            </div>
          )}

          {orderHistory.length > 0 && (
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
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(order.total)}
                    </span>
                  </li>
                ))}
              </ul>
              {orderHistory.length > 3 && (
                <p className="text-[11px] tracking-[0.3em] text-slate-400 uppercase dark:text-white/40">
                  Showing latest 3 of {orderHistory.length}
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
                className="focus:border-brand-400 focus:ring-brand-200 dark:focus:border-brand-300 dark:focus:ring-brand-400/30 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white"
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
                className="focus:border-brand-400 focus:ring-brand-200 dark:focus:border-brand-300 dark:focus:ring-brand-400/30 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white"
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
              className="focus:border-brand-400 focus:ring-brand-200 dark:focus:border-brand-300 dark:focus:ring-brand-400/30 rounded-2xl border border-stone-200/60 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:ring-2 focus:outline-none dark:border-white/20 dark:bg-white/10 dark:text-white"
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
                'bg-brand-500 focus-visible:ring-brand-200 dark:focus-visible:ring-brand-400 inline-flex items-center justify-center rounded-full px-7 py-3 text-xs font-semibold tracking-[0.35em] text-white uppercase transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950',
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
