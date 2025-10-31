#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ordersStorePath = resolve(here, '../src/stores/orders.ts');

try {
  const source = await readFile(ordersStorePath, 'utf8');
  const persistKey = source.match(/name:\s*'([^']+)'/);
  const maxHistory = source.match(/const MAX_HISTORY = (\d+);/);
  const hasClearOrders = source.includes('clearOrders');

  console.log(
    JSON.stringify(
      {
        ok: true,
        persistKey: persistKey ? persistKey[1] : null,
        maxHistory: maxHistory ? Number(maxHistory[1]) : null,
        hasClearOrders,
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
            : 'Unable to read orders store source file.',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
