import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ThemeProvider } from './providers/ThemeProvider.tsx';
import { ToastProvider } from './providers/toast-context.tsx';
import './index.css';

const queryClient = new QueryClient();

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const stationMap = [
    'Station.Terminal → Station.LayoutDeck → Station.FrontCounter',
    'Station.MenuHall → Station.PizzaLine',
    'Station.CheckoutBay → Station.ToastWindow',
    'Station.SignalRoom → Station.SparklineLab',
    'Station.HourlyBoard → Station.ChannelMixer',
  ];
  // Surface a little developer treat without polluting production logs
  console.info(
    '%cLoftwah Station Map%c\n%s',
    'font-weight:700; color:#f97316;',
    'color:inherit;',
    stationMap.join('\n'),
  );
  (
    window as typeof window & { __LOFTWAH_STATIONS__?: string[] }
  ).__LOFTWAH_STATIONS__ = stationMap;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
