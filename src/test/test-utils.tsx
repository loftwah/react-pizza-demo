import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';
import { ThemeProvider } from '../providers/ThemeProvider';
import { ToastProvider } from '../providers/toast-context';

type WrapperOptions = {
  route?: string;
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
  queryClientConfig?: QueryClientConfig;
};

export const createTestQueryClient = (
  config?: QueryClientConfig,
): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
    ...config,
  });

export const renderWithProviders = (
  ui: ReactElement,
  options?: WrapperOptions & Omit<RenderOptions, 'wrapper'>,
) => {
  const {
    route = '/',
    routerProps,
    queryClient: providedQueryClient,
    queryClientConfig,
    ...renderOptions
  } = options ?? {};

  const queryClient =
    providedQueryClient ?? createTestQueryClient(queryClientConfig);

  const memoryRouterProps: MemoryRouterProps = {
    initialEntries: [route],
    ...routerProps,
  };

  if (routerProps?.initialEntries) {
    memoryRouterProps.initialEntries = routerProps.initialEntries;
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter {...memoryRouterProps}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper, ...renderOptions }),
  };
};

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
