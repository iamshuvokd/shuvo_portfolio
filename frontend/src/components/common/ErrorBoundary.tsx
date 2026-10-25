import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown when a child throws. Defaults to rendering nothing, so one broken section cannot blank the page. */
  fallback?: ReactNode;
  /** Label used in the console so a failure is easy to trace. */
  name?: string;
}

interface State {
  failed: boolean;
}

/** Catches render errors below it. Without this, one bad value turns the entire site white. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info.componentStack);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

export default ErrorBoundary;
