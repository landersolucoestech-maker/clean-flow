import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { Button } from "./shared/components/ui/button";
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
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">CleanFlow</p>
          <h1 className="mt-2 text-2xl font-semibold">Não foi possível carregar esta tela</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Um erro inesperado interrompeu a renderização. Recarregue a aplicação para tentar novamente.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Recarregar aplicação
          </Button>
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
