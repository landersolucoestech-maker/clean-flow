import { type ReactNode } from "react";
import { PageLayoutTopContentContext } from "./page-layout-top-content-context";

interface PageLayoutTopContentProviderProps {
  children: ReactNode;
  content: ReactNode;
}

export function PageLayoutTopContentProvider({ children, content }: PageLayoutTopContentProviderProps) {
  return (
    <PageLayoutTopContentContext.Provider value={content}>
      {children}
    </PageLayoutTopContentContext.Provider>
  );
}
