export type Ok<T> = { ok: true; value: T };
export type Err<E = Error> = { ok: false; error: E };

export type Result<TValue, TError = Error> = Ok<TValue> | Err<TError>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export type StepStatus = 'ok' | 'degraded' | 'failed';

export type StepError = {
  kind: string;
  message: string;
  retryable: boolean;
};

export type StepResult<TValue = void> = {
  status: StepStatus;
  attempts: number;
  value?: TValue;
  error?: StepError;
  nextStep?: string;
};

export type StepLog = {
  step: string;
  status: StepStatus;
  attempts: number;
  error?: StepError;
  nextStep?: string;
};

export type PipelineResult<TValue, TError = StepError> = Result<
  TValue,
  TError
> & {
  timeline: StepLog[];
  degraded: StepLog[];
  correlationId: string;
};
