import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isDevEnvironment } from '../shared-utils/env';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDevEnvironment()) {
      console.error('Error captured by ErrorBoundary:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error);
      }
      return (
        fallback ?? (
          <div role="alert">
            <p>Something went wrong.</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

if (import.meta.env.DEV) {
  Object.defineProperty(ErrorBoundary, 'displayName', {
    value: 'Station.SafeGuard',
  });
}
