class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

type MatchMediaResult = {
  matches: boolean;
  media: string;
  onchange: ((event: unknown) => void) | null;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
};

export const setupNodeEnv = async () => {
  if (typeof window !== 'undefined') {
    return;
  }

  if (typeof globalThis.fetch === 'undefined') {
    throw new Error(
      'Fetch is not available in this Node runtime. Upgrade to Node 18+.',
    );
  }

  const storage = new MemoryStorage();

  const matchMedia = (query: string): MatchMediaResult => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });

  const fakeWindow = {
    localStorage: storage,
    navigator: {
      sendBeacon: () => false,
      userAgent: 'node',
    },
    matchMedia,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };

  const fakeDocument = {
    createElement: () => ({
      style: {},
      setAttribute: () => undefined,
      appendChild: () => undefined,
      remove: () => undefined,
    }),
    body: {
      appendChild: () => undefined,
      removeChild: () => undefined,
    },
  };

  // @ts-expect-error assigning to global scope
  globalThis.window = fakeWindow;
  // @ts-expect-error assigning to global scope
  globalThis.localStorage = storage;
  // @ts-expect-error assigning to global scope
  globalThis.navigator = fakeWindow.navigator;
  // @ts-expect-error assigning to global scope
  globalThis.document = fakeDocument;
  // @ts-expect-error assigning to global scope
  globalThis.self = globalThis;
};
