import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuSeed, analyticsSeed } from '../src/data/mock-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const apiDir = path.join(repoRoot, 'public', 'api');

const formatJson = (value: unknown) =>
  `${JSON.stringify(value, null, 2)}\n`;

async function main() {
  await mkdir(apiDir, { recursive: true });

  await Promise.all([
    writeFile(path.join(apiDir, 'menu.json'), formatJson(menuSeed), 'utf8'),
    writeFile(
      path.join(apiDir, 'analytics.json'),
      formatJson({
        ...analyticsSeed,
        topPizzas: analyticsSeed.topPizzas.map((pizza) => ({
          ...pizza,
          share: Number(pizza.share.toFixed(2)),
        })),
      }),
      'utf8',
    ),
  ]);
}

await main();
