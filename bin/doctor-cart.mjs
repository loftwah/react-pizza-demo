#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cartStorePath = resolve(here, '../src/stores/cart.ts');

try {
  const source = await readFile(cartStorePath, 'utf8');
  const persistKey = source.match(/name:\s*'([^']+)'/);
  const hasHydrate = source.includes('hydrateFromOrder');
  const hasTotalPrice = source.includes('totalPrice: () =>');

  console.log(
    JSON.stringify(
      {
        ok: true,
        persistKey: persistKey ? persistKey[1] : null,
        hasHydrateFromOrder: hasHydrate,
        hasTotalPrice,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to read cart store source file.',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
