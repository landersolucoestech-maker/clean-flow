import { type ReactNode } from "react";
import { PageLayoutTopContentProvider } from "@/components/layout/PageLayoutTopContent";
import { CrmTabs } from "./CrmTabs";

interface CrmLegacyPageBridgeProps {
  children: ReactNode;
}

export function CrmLegacyPageBridge({ children }: CrmLegacyPageBridgeProps) {
  return (
    <PageLayoutTopContentProvider content={<CrmTabs />}>
      {children}
    </PageLayoutTopContentProvider>
  );
}
