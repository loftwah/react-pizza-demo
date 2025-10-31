#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises';
import { setupNodeEnv } from '../scripts/setup-node-env';
import { createCorrelationId } from '../src/shared-utils/telemetry';
import type { OrderRunInput } from '../src/services/order-service';

type StepName = string;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options: {
    step?: StepName;
    file?: string;
    base?: string;
  } = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--step') {
      options.step = args[index + 1] as StepName;
      index += 1;
    } else if (token === '--file') {
      options.file = args[index + 1];
      index += 1;
    } else if (token === '--base') {
      options.base = args[index + 1];
      index += 1;
    }
  }

  return options;
};

const loadJson = async <T>(path?: string): Promise<T | null> => {
  if (!path) return null;
  const content = await readFile(path, 'utf8');
  return JSON.parse(content) as T;
};

const buildDefaultInput = async (): Promise<OrderRunInput> => ({
  customer: 'Pipeline Debug',
  contact: 'debug@example.com',
  instructions: 'Extra monitoring.',
  cartDetails: [
    {
      id: 'pepperoni-classic-medium',
      pizzaId: 'pepperoni-classic',
      size: 'medium',
      name: 'Pepperoni Classic',
      sizeLabel: 'Medium 12″',
      quantity: 1,
      unitPrice: 16,
      lineTotal: 16,
    },
  ],
  cartTotal: 16,
});

const runStep = async (
  serviceModule: typeof import('../src/services/order-service'),
  step: StepName,
  overrides: Record<string, unknown> | null,
) => {
  if (overrides?.correlationId && typeof overrides.correlationId !== 'string') {
    delete overrides.correlationId;
  }

  const correlationId =
    typeof overrides?.correlationId === 'string'
      ? (overrides.correlationId as string)
      : createCorrelationId();

  const service = new serviceModule.OrderService();
  const handler = (service as Record<string, unknown>)[step];

  if (typeof handler !== 'function') {
    console.error(JSON.stringify({ ok: false, error: `Unknown step ${step}` }));
    process.exitCode = 1;
    return;
  }

  const context = {
    correlationId,
    ...overrides,
  };

  const result = await (
    handler as (ctx: Record<string, unknown>) => unknown
  ).call(service, context);

  console.log(JSON.stringify({ ok: true, step, result }, null, 2));

  if ((result as { status?: string })?.status === 'failed') {
    process.exitCode = 1;
  }
};

const runPipeline = async (
  serviceModule: typeof import('../src/services/order-service'),
  overrides: Partial<OrderRunInput> | null,
) => {
  const baseInput = await buildDefaultInput();
  const input = { ...baseInput, ...overrides };

  const service = new serviceModule.OrderService();
  const result = await service.run(input);

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
};

const main = async () => {
  const { step, file, base } = parseArgs();

  if (base) {
    process.env.PUBLIC_BASE_URL = base.endsWith('/') ? base : `${base}/`;
  }

  await setupNodeEnv();
  const serviceModule = await import('../src/services/order-service');

  if (step && !serviceModule.OrderService.steps.includes(step as never)) {
    console.error(JSON.stringify({ ok: false, error: `Unknown step ${step}` }));
    process.exit(1);
  }

  if (step) {
    const context = await loadJson<Record<string, unknown>>(file);
    await runStep(serviceModule, step, context);
    return;
  }

  const overrides = await loadJson<Partial<OrderRunInput>>(file);
  await runPipeline(serviceModule, overrides ?? null);
};

void main();
