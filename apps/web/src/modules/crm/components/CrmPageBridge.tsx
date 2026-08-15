import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ContactRound, Repeat, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { PageLayoutTopContentProvider } from "@/components/layout/PageLayoutTopContent";
import { useCustomers } from "@/hooks/useCustomers";
import { useLeads } from "../leads/hooks/useLeads";
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
  icon: typeof Users;
};

function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 2xl:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex min-h-[68px] min-w-0 items-center gap-3 rounded-md border border-border bg-card px-3.5 py-2.5">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${metric.tone}`}>
            <metric.icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline justify-between gap-2">
              <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground">{metric.label}</p>
              <p className="shrink-0 text-base font-semibold leading-5 tracking-tight text-foreground">{metric.value}</p>
            </div>
            <p className="mt-0.5 truncate text-[10px] leading-4 text-muted-foreground/80">{metric.helper}</p>
          </div>
        </div>
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
    const count = (statuses: string[]) => leads.filter((lead) => statuses.includes(lead.status)).length;
    const inProgress = count(["qualification", "visit_scheduled", "estimate_completed", "negotiation"]);
    const followUp = count(["cold_followup", "warm_followup", "reactivation"]);
    const converted = count(["active_customer"]);
    const lost = count(["disqualified"]);

    metrics = [
      { label: "Total Leads", value: leads.length, helper: `${lost} lost / disqualified`, icon: Users, tone: "bg-muted text-foreground" },
      { label: "New Leads", value: count(["new_lead"]), helper: "awaiting qualification", icon: UserPlus, tone: "bg-primary/10 text-primary" },
      { label: "In Progress", value: inProgress, helper: "active sales pipeline", icon: Repeat, tone: "bg-warning/10 text-warning" },
      { label: "Follow-up", value: followUp, helper: "nurture and reactivation", icon: Repeat, tone: "bg-secondary-light text-foreground" },
      { label: "Converted", value: converted, helper: "active customers", icon: UserCheck, tone: "bg-success/10 text-success" },
    ];
  } else if (isContacts) {
    const active = contacts.filter((contact) => contact.status === "Active").length;
    metrics = [
      { label: "Total Contacts", value: contacts.length, helper: "registered", icon: ContactRound, tone: "bg-muted text-foreground" },
      { label: "Active Contacts", value: active, helper: "currently active", icon: UserCheck, tone: "bg-primary/10 text-primary" },
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
      { label: "Active Customers", value: activeCount, helper: "currently active", icon: UserCheck, tone: "bg-primary/10 text-primary" },
      { label: "Inactive Customers", value: inactiveCount, helper: "currently inactive", icon: UserX, tone: "bg-destructive/10 text-destructive" },
      { label: "Total Customers", value: customers.length, helper: "registered", icon: Users, tone: "bg-muted text-foreground" },
      { label: "Recurring Customers", value: recurringCount, helper: "active recurring", icon: Repeat, tone: "bg-warning/10 text-warning" },
    ];
  }

  return (
    <section className="space-y-2.5">
      <MetricStrip metrics={metrics} />
      <CrmTabs />
    </section>
  );
}

export function CrmPageBridge({ children }: CrmPageBridgeProps) {
  return <PageLayoutTopContentProvider content={<CrmWorkspaceHeader />}>{children}</PageLayoutTopContentProvider>;
}
