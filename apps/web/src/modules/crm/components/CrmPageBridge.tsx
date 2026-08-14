import { type ReactNode } from "react";
import { UserPlus, UserCheck, UserX, Users, Repeat } from "lucide-react";
import { PageLayoutTopContentProvider } from "@/components/layout/PageLayoutTopContent";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers } from "@/hooks/useCustomers";
import { CrmTabs } from "./CrmTabs";

interface CrmPageBridgeProps {
  children: ReactNode;
}

function CrmWorkspaceHeader() {
  const { data: customers = [] } = useCustomers();
  const activeCount = customers.filter((customer) => customer.status === "Active").length;
  const inactiveCount = customers.filter((customer) => customer.status === "Inactive").length;
  const recurringCount = customers.filter((customer) => customer.frequency && customer.frequency !== "one-time" && customer.status === "Active").length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newCustomersThisMonth = customers.filter((customer) => customer.customer_since && new Date(customer.customer_since) >= startOfMonth).length;

  const metrics = [
    { label: "New Customers", value: newCustomersThisMonth, helper: "this month", icon: UserPlus, tone: "bg-success/10 text-success" },
    { label: "Active Customers", value: activeCount, helper: "currently active", icon: UserCheck, tone: "bg-primary-light text-primary" },
    { label: "Inactive Customers", value: inactiveCount, helper: "currently inactive", icon: UserX, tone: "bg-destructive/10 text-destructive" },
    { label: "Total Customers", value: customers.length, helper: "registered", icon: Users, tone: "bg-secondary-light text-foreground" },
    { label: "Recurring Customers", value: recurringCount, helper: "active recurring", icon: Repeat, tone: "bg-warning/10 text-warning" },
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.label} className="rounded-md border-border/80 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.helper}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${metric.tone}`}>
                <metric.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
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
