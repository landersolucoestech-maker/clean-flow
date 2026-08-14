import { createContext, type ReactNode, useContext } from "react";

const PageLayoutTopContentContext = createContext<ReactNode>(null);

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

export function usePageLayoutTopContent() {
  return useContext(PageLayoutTopContentContext);
}
