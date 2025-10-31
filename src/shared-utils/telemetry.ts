import { err, ok, type Result } from './result';
import { isDevEnvironment } from './env';

export type TelemetryStatus = 'ok' | 'degraded' | 'failed';

export type TelemetryFailure = {
  kind: string;
  message: string;
  retryable: boolean;
};

export type TelemetryRecord = {
  component: string;
  action: string;
  status: TelemetryStatus;
  correlationId: string;
  nextStep?: string;
  error?: {
    kind: string;
    message: string;
  };
  payload?: Record<string, unknown>;
};

const MELBOURNE_TZ = 'Australia/Melbourne';

const formatLocalTimestamp = (date: Date) =>
  new Intl.DateTimeFormat('en-AU', {
    timeZone: MELBOURNE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '');

const buildEnvelope = (record: TelemetryRecord) => {
  const now = new Date();
  return {
    ts_local: `${formatLocalTimestamp(now)} (${MELBOURNE_TZ})`,
    ts_utc: now.toISOString(),
    ...record,
    payload: record.payload ?? {},
  };
};

const ensureBrowser = (): Result<true, TelemetryFailure> => {
  if (typeof window === 'undefined') {
    return err({
      kind: 'TransportUnavailable',
      message: 'Telemetry transport requires a browser runtime.',
      retryable: false,
    });
  }
  return ok(true);
};

export const createCorrelationId = () =>
  `corr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

export const emitEvent = async (
  record: TelemetryRecord,
): Promise<Result<true, TelemetryFailure>> => {
  const transport = ensureBrowser();
  if (!transport.ok) {
    if (isDevEnvironment()) {
      console.warn('[telemetry] transport unavailable', transport.error);
    }
    return transport;
  }

  if (isDevEnvironment()) {
    console.log('[telemetry]', buildEnvelope(record));
    return ok(true);
  }

  try {
    const body = JSON.stringify(buildEnvelope(record));
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon('/telemetry', blob);
      if (sent) return ok(true);
    }

    const response = await fetch('/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`Telemetry endpoint responded ${response.status}`);
    }

    return ok(true);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown telemetry failure';
    if (isDevEnvironment()) {
      console.warn('[telemetry] failed to emit event', message);
    }
    return err({
      kind: 'SendFailed',
      message,
      retryable: true,
    });
  }
};
