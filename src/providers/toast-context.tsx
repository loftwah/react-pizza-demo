import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

type ToastTone = 'info' | 'success' | 'error';

export type ShowToastOptions = {
  message: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastRecord = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const isBrowser = typeof window !== 'undefined';

const toneStyles: Record<ToastTone, string> = {
  info: 'border-slate-300/60 bg-white/80 text-slate-800 shadow-slate-400/30 dark:border-white/20 dark:bg-white/15 dark:text-white',
  success:
    'border-emerald-400/60 bg-emerald-50/90 text-emerald-800 shadow-emerald-600/20 dark:border-emerald-300/35 dark:bg-emerald-500/10 dark:text-emerald-200',
  error:
    'border-red-500/50 bg-red-50/95 text-red-700 shadow-red-500/30 dark:border-red-200/35 dark:bg-red-500/15 dark:text-red-100',
};

const createToastId = () =>
  `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const useToastTimers = () => {
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(
    () => () => {
      if (!isBrowser) return;
      timers.current.forEach((timerId) => window.clearTimeout(timerId));
      timers.current.clear();
    },
    [],
  );

  const registerTimer = useCallback((id: string, timerId: number) => {
    if (!isBrowser) return;
    timers.current.set(id, timerId);
  }, []);

  const clearTimer = useCallback((id: string) => {
    if (!isBrowser) return;
    const timerId = timers.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timers.current.delete(id);
    }
  }, []);

  return { registerTimer, clearTimer };
};

const ToastViewport = ({
  toasts,
  dismiss,
}: {
  toasts: ToastRecord[];
  dismiss: (id: string) => void;
}) => (
  <div
    aria-live="polite"
    aria-atomic="true"
    aria-relevant="additions text"
    className="pointer-events-none fixed right-6 bottom-6 z-50 flex max-w-sm flex-col gap-3 sm:right-8 sm:bottom-8"
  >
    {toasts.map((toast) => (
      <div
        key={toast.id}
        role="status"
        className={clsx(
          'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md transition duration-200',
          toneStyles[toast.tone],
        )}
      >
        <span className="flex-1 leading-relaxed">{toast.message}</span>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          className="rounded-full border border-current/20 px-2 py-1 text-[10px] font-semibold tracking-[0.25em] text-inherit uppercase transition hover:bg-current/5 focus-visible:ring-2 focus-visible:ring-current/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none dark:focus-visible:ring-offset-neutral-950"
        >
          Close
        </button>
      </div>
    ))}
  </div>
);

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const { clearTimer, registerTimer } = useToastTimers();

  const dismiss = useCallback(
    (id: string) => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      clearTimer(id);
    },
    [clearTimer],
  );

  const showToast = useCallback(
    ({ message, tone = 'info', duration = 3500 }: ShowToastOptions) => {
      const id = createToastId();
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (!isBrowser || duration <= 0) return;
      const timerId = window.setTimeout(() => {
        dismiss(id);
      }, duration);
      registerTimer(id, timerId);
    },
    [dismiss, registerTimer],
  );

  const value = useMemo(
    () =>
      ({
        showToast,
      }) satisfies ToastContextValue,
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

if (import.meta.env.DEV) {
  Object.defineProperty(ToastProvider, 'displayName', {
    value: 'Station.ToastWindow',
  });
}
