/**
 * React Error Boundary
 *
 * Catches runtime errors anywhere in the component tree below it,
 * prevents the entire app from crashing, and shows a friendly fallback UI.
 *
 * Must be a class component — React does not support error boundaries
 * with function components / hooks yet.
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in development; replace with a reporting service in production
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow a custom fallback via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ marginBottom: '0.5rem', color: '#b91c1c' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '420px', marginBottom: '1.5rem' }}>
            An unexpected error occurred. You can try refreshing the page or
            clicking the button below.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
