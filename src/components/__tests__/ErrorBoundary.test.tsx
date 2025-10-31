import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const Thrower = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Something went wrong');
  }
  return <p>All good</p>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no errors occur', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders render-prop fallback when a child throws', () => {
    const fallback = vi.fn((error: Error) => (
      <div role="alert">Recovered: {error.message}</div>
    ));

    const { rerender } = render(
      <ErrorBoundary fallback={fallback}>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary fallback={fallback}>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(fallback).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Recovered: Something went wrong',
    );
  });

  it('resets error state when children change after an error', () => {
    const fallback = <div role="alert">Fallback UI</div>;

    const { rerender } = render(
      <ErrorBoundary fallback={fallback}>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary fallback={fallback}>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Fallback UI');

    rerender(
      <ErrorBoundary fallback={fallback}>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
