import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          We're sorry, but something unexpected happened. The error has been logged and our team will look into it.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
              Error Details (Development Only)
            </summary>
            <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-auto text-red-600 dark:text-red-400">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// Specialized error boundaries for different parts of the app
export const SocialErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, reset }) => (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
          Social Features Error
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          There was an error loading the social features. Please try again.
        </p>
        <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Retry
        </button>
        {process.env.NODE_ENV === 'development' && error && (
          <pre className="mt-4 text-xs text-red-600 dark:text-red-400 overflow-auto">
            {error.message}
          </pre>
        )}
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const StudyErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, reset }) => (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800">
        <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-2">
          Study Tools Error
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          There was an error with the study tools. Your progress is safe.
        </p>
        <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Continue Studying
        </button>
        {process.env.NODE_ENV === 'development' && error && (
          <pre className="mt-4 text-xs text-amber-600 dark:text-amber-400 overflow-auto">
            {error.message}
          </pre>
        )}
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export const ChatErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, reset }) => (
      <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900">
        <div className="text-center p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Chat Connection Error
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            There was an error with the AI tutor. Please try reconnecting.
          </p>
          <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Reconnect
          </button>
          {process.env.NODE_ENV === 'development' && error && (
            <pre className="mt-4 text-xs text-slate-600 dark:text-slate-400 overflow-auto">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);