import type { PropsWithChildren } from 'react';
import { Header } from './Header';

export const Layout = ({ children }: PropsWithChildren) => (
  <div className="min-h-screen bg-transparent text-slate-900 transition-colors duration-300 dark:bg-transparent dark:text-white">
    <Header />
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 pt-10 pb-16">
      {children}
    </main>
    <footer className="print-hidden border-t border-stone-200/70 bg-white/70 py-8 text-center text-xs tracking-[0.3em] text-stone-500 uppercase transition-colors dark:border-white/5 dark:bg-black/50 dark:text-white/40">
      Crafted for the React Pizza demo – {new Date().getFullYear()}
      {' | '}
      <a
        href="https://github.com/loftwah/react-pizza-demo"
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-500 hover:text-brand-400 dark:text-brand-300 dark:hover:text-brand-200 transition-colors"
      >
        View the code on GitHub
      </a>
    </footer>
  </div>
);
