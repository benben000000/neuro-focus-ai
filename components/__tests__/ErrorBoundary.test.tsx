import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('should call onError prop when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should reset error state when reset button is clicked', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const resetButton = screen.getByText('Try Again');
    fireEvent.click(resetButton);

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  it('should display custom fallback when provided', () => {
    const CustomFallback: React.FC<{ error?: Error; reset: () => void }> = ({ reset }) => (
      <div>
        <h1>Custom Error</h1>
        <button onClick={reset}>Custom Reset</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Custom Reset')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error Details/)).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Specialized Error Boundaries', () => {
  it('SocialErrorBoundary should render appropriate fallback', () => {
    render(
      <SocialErrorBoundary>
        <ThrowErrorComponent />
      </SocialErrorBoundary>
    );

    expect(screen.getByText('Social Features Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error loading social features')).toBeInTheDocument();
  });

  it('StudyErrorBoundary should render appropriate fallback', () => {
    render(
      <StudyErrorBoundary>
        <ThrowErrorComponent />
      </StudyErrorBoundary>
    );

    expect(screen.getByText('Study Tools Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error with study tools')).toBeInTheDocument();
  });

  it('ChatErrorBoundary should render appropriate fallback', () => {
    render(
      <ChatErrorBoundary>
        <ThrowErrorComponent />
      </ChatErrorBoundary>
    );

    expect(screen.getByText('Chat Connection Error')).toBeInTheDocument();
    expect(screen.getByText('There was an error with AI tutor')).toBeInTheDocument();
  });
});