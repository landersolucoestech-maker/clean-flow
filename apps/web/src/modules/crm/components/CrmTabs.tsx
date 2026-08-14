import { NavLink } from "react-router-dom";
import { Users, UserRoundSearch, ContactRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";

const tabs = [
  { label: "Customers", href: "/crm", end: true, icon: Users, permission: "customers.view" },
  { label: "Leads", href: "/crm/leads", end: false, icon: UserRoundSearch, permission: "leads.view" },
  { label: "Contacts", href: "/crm/contacts", end: false, icon: ContactRound, permission: "contacts.view" },
] as const;

export function CrmTabs() {
  const { hasPermission } = usePermission();
  const visibleTabs = tabs.filter((tab) => hasPermission(tab.permission));
  return (
    <nav className="rounded-2xl border border-border bg-card p-1.5 shadow-sm" aria-label="CRM navigation">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {visibleTabs.map((tab) => <NavLink key={tab.href} to={tab.href} end={tab.end} className={({ isActive }) => cn("flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground")}><tab.icon className="h-4 w-4" aria-hidden="true" />{tab.label}</NavLink>)}
      </div>
    </nav>
  );
}
