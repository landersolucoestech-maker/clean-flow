import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ContactRound, Repeat, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { PageLayoutTopContentProvider } from "@/components/layout/PageLayoutTopContent";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers } from "@/hooks/useCustomers";
import { useLeads, LEAD_STATUSES } from "../leads/hooks/useLeads";
import { useContacts } from "../contacts/hooks/useContacts";
import { CrmTabs } from "./CrmTabs";

interface CrmPageBridgeProps {
  children: ReactNode;
}

type Metric = {
  label: string;
  value: number;
  helper: string;
  tone: string;
  icon?: typeof Users;
  dot?: string;
};

function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <Card key={metric.label} className="rounded-md border-border/80 shadow-sm">
          <CardContent className="flex min-h-[92px] items-center justify-between p-4">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
              <p className="truncate text-xs text-muted-foreground">{metric.helper}</p>
            </div>
            {metric.icon ? (
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${metric.tone}`}>
                <metric.icon className="h-5 w-5" />
              </div>
            ) : (
              <span className={`h-3 w-3 shrink-0 rounded-full ring-4 ring-background ${metric.dot ?? "bg-muted-foreground"}`} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CrmWorkspaceHeader() {
  const { pathname } = useLocation();
  const { data: customers = [] } = useCustomers();
  const { data: leads = [] } = useLeads();
  const { contacts } = useContacts();

  const isLeads = pathname.startsWith("/crm/leads");
  const isContacts = pathname.startsWith("/crm/contacts");

  let metrics: Metric[];

  if (isLeads) {
    metrics = LEAD_STATUSES.map((status) => ({
      label: status.label,
      value: leads.filter((lead) => lead.status === status.value).length,
      helper: "pipeline status",
      tone: "",
      dot: status.color,
    }));
  } else if (isContacts) {
    const active = contacts.filter((contact) => contact.status === "Active").length;
    metrics = [
      { label: "Total Contacts", value: contacts.length, helper: "registered", icon: ContactRound, tone: "bg-secondary-light text-foreground" },
      { label: "Active Contacts", value: active, helper: "currently active", icon: UserCheck, tone: "bg-primary-light text-primary" },
      { label: "Suppliers", value: contacts.filter((contact) => contact.contactType === "Supplier").length, helper: "business contacts", icon: Users, tone: "bg-success/10 text-success" },
      { label: "Partners", value: contacts.filter((contact) => contact.contactType === "Partner").length, helper: "business contacts", icon: Users, tone: "bg-warning/10 text-warning" },
      { label: "Service Providers", value: contacts.filter((contact) => contact.contactType === "Service Provider").length, helper: "business contacts", icon: Users, tone: "bg-secondary-light text-foreground" },
    ];
  } else {
    const activeCount = customers.filter((customer) => customer.status === "Active").length;
    const inactiveCount = customers.filter((customer) => customer.status === "Inactive").length;
    const recurringCount = customers.filter((customer) => customer.frequency && customer.frequency !== "one-time" && customer.status === "Active").length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = customers.filter((customer) => customer.customer_since && new Date(customer.customer_since) >= startOfMonth).length;
    metrics = [
      { label: "New Customers", value: newCustomersThisMonth, helper: "this month", icon: UserPlus, tone: "bg-success/10 text-success" },
      { label: "Active Customers", value: activeCount, helper: "currently active", icon: UserCheck, tone: "bg-primary-light text-primary" },
      { label: "Inactive Customers", value: inactiveCount, helper: "currently inactive", icon: UserX, tone: "bg-destructive/10 text-destructive" },
      { label: "Total Customers", value: customers.length, helper: "registered", icon: Users, tone: "bg-secondary-light text-foreground" },
      { label: "Recurring Customers", value: recurringCount, helper: "active recurring", icon: Repeat, tone: "bg-warning/10 text-warning" },
    ];
  }

  return (
    <section className="space-y-4">
      <MetricStrip metrics={metrics} />
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
