import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled React render error", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <section className="w-full max-w-lg border-l-2 border-primary/40 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Maid Flow</p>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.02em]">Unable to load this screen</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">An unexpected rendering error occurred. Reload the application to try again.</p>
          <button className="mt-5 h-9 rounded-md bg-foreground px-3.5 text-sm font-medium text-background" onClick={() => window.location.reload()} type="button">Reload application</button>
        </section>
      </main>
    );
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element was not found");

createRoot(root).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
