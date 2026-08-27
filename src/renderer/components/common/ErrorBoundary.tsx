import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level render-error containment (see App.tsx) - without this, a render-time exception
 * anywhere in the view tree (a malformed entry, an unexpected null, ...) blanks the whole window
 * with no recovery short of force-quitting and relaunching. Has to be a class component: React
 * error boundaries are one of the few remaining APIs with no hook equivalent
 * (getDerivedStateFromError/componentDidCatch aren't available as hooks).
 *
 * Deliberately just a "reload the app" fallback, not a "try to keep going" one - this app has no
 * routing/URL state to preserve across a reload (see App.tsx's plain in-memory View union), so
 * there's nothing more sophisticated a partial-recovery attempt would actually buy here.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No crash-reporting pipeline exists in this app (a personal local-only tool) - console is the
    // only place this is ever going to be visible, same as an uncaught error would've been anyway.
    console.error('Unhandled error in renderer:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Media Journal ran into an unexpected error and can&apos;t continue showing this screen.</p>
          <p className="hint">{this.state.error.message}</p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
