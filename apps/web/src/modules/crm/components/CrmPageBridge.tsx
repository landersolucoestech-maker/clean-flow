import { type ReactNode } from "react";
import { PageLayoutTopContentProvider } from "@/components/layout/PageLayoutTopContent";
import { CrmTabs } from "./CrmTabs";

interface CrmPageBridgeProps {
  children: ReactNode;
}

export function CrmPageBridge({ children }: CrmPageBridgeProps) {
  return (
    <PageLayoutTopContentProvider content={<CrmTabs />}>
      {children}
    </PageLayoutTopContentProvider>
  );
}
