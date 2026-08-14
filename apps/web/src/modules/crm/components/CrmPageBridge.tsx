import { type ReactNode } from "react";
import { PageLayoutTopContentProvider } from "@/components/layout/PageLayoutTopContent";
import { CrmTabs } from "./CrmTabs";

interface CrmPageBridgeProps {
  children: ReactNode;
}

function CrmWorkspaceHeader() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Customer relationships</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">CRM</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Customers, leads and business contacts in one unified workspace.
        </p>
      </div>
      <CrmTabs />
    </section>
  );
}

export function CrmPageBridge({ children }: CrmPageBridgeProps) {
  return (
    <PageLayoutTopContentProvider content={<CrmWorkspaceHeader />}>
      {children}
    </PageLayoutTopContentProvider>
  );
}
