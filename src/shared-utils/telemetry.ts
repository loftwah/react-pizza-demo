type TelemetryPayload = Record<string, unknown>;

const isBrowser = typeof window !== 'undefined';

const buildEventEnvelope = (event: string, payload: TelemetryPayload) => ({
  event,
  payload,
  at: new Date().toISOString(),
});

export const emitEvent = async (event: string, payload: TelemetryPayload) => {
  if (!isBrowser) {
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[telemetry]', buildEventEnvelope(event, payload));
    return;
  }

  try {
    const body = JSON.stringify(buildEventEnvelope(event, payload));
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon('/telemetry', blob);
      if (sent) return;
    }
    await fetch('/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[telemetry] failed to emit event', error);
    }
  }
};
