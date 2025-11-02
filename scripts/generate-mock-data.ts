import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const apiDir = path.join(repoRoot, 'public', 'api');

const formatJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const loadAnalytics = async (filePath: string) => {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

async function main() {
  const started = performance.now();
  await mkdir(apiDir, { recursive: true });

  const analyticsPath = path.join(apiDir, 'analytics.json');
  const analytics = await loadAnalytics(analyticsPath);
  if (analytics) {
    const withRoundedShare =
      typeof analytics === 'object' && analytics && 'topPizzas' in analytics
        ? {
            ...(analytics as Record<string, unknown>),
            topPizzas: Array.isArray(
              (analytics as { topPizzas?: unknown[] }).topPizzas,
            )
              ? ((analytics as { topPizzas?: unknown[] }).topPizzas ?? []).map(
                  (pizza) => {
                    if (
                      typeof pizza !== 'object' ||
                      pizza === null ||
                      !('share' in pizza)
                    ) {
                      return pizza;
                    }
                    const share =
                      Number(
                        Number(
                          (pizza as { share?: number }).share ?? 0,
                        ).toFixed(2),
                      ) || 0;
                    return { ...(pizza as Record<string, unknown>), share };
                  },
                )
              : [],
          }
        : analytics;

    await writeFile(analyticsPath, formatJson(withRoundedShare), 'utf8');
  }

  const duration = performance.now() - started;
  if (process.env.DEBUG_MOCK_DATA === '1') {
    console.log(
      `[generate-mock-data] refreshed analytics.json in ${duration.toFixed(
        1,
      )}ms`,
    );
  }
}

await main();
