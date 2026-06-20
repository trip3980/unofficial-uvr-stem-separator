import React from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

type AppErrorBoundaryProps = {
  boundaryKey: string;
  children: React.ReactNode;
  onReturnHome?: () => void;
};

type AppErrorBoundaryState = {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("OpenStem recoverable UI boundary caught an error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      boundaryKey: this.props.boundaryKey,
    });
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (prevProps.boundaryKey !== this.props.boundaryKey && this.state.error) {
      this.resetBoundary();
    }
  }

  resetBoundary = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="rounded-2xl border border-rose-500/25 bg-rose-950/10 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-rose-200">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold">Recoverable UI Error</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This section hit a renderer error. OpenStem contained it inside the current tab so the
              rest of the app can keep running. No source audio, transcript, model file, or output
              file was deleted by this recovery card.
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3 font-mono text-[11px] text-rose-100">
              {this.state.error.message || "Unknown renderer error"}
            </div>
            {this.state.errorInfo?.componentStack && (
              <details className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-slate-300">
                  Diagnostic details
                </summary>
                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.resetBoundary}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-950/30 px-3 py-2 text-xs font-bold text-rose-100 hover:bg-rose-900/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry Section
            </button>
            {this.props.onReturnHome && (
              <button
                type="button"
                onClick={this.props.onReturnHome}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-500/30 bg-slate-900/60 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-800"
              >
                <Home className="h-3.5 w-3.5" />
                Return To Audio Separator
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }
}
