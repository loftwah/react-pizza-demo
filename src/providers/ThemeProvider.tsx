import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import {
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from './theme-context';

const STORAGE_KEY = 'react-pizza-theme';

const isBrowser = typeof window !== 'undefined';

const getStoredTheme = (): Theme | null => {
  if (!isBrowser) return null;
  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  return fromStorage === 'light' || fromStorage === 'dark' ? fromStorage : null;
};

const getPreferredTheme = (): Theme => {
  if (!isBrowser) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
};

const applyThemeToDocument = (theme: Theme) => {
  if (!isBrowser) return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  if (document.body) {
    document.body.dataset.theme = theme;
  }
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setThemeState] = useState<Theme>(
    () => getStoredTheme() ?? getPreferredTheme(),
  );

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    if (!isBrowser) return;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!isBrowser) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const stored = getStoredTheme();
    if (stored) return;
    const listener = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? 'light' : 'dark');
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () =>
      ({
        theme,
        setTheme,
        toggleTheme,
      }) satisfies ThemeContextValue,
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
