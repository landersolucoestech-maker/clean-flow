import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";

const tabs = [
  { label: "Customers", href: "/crm", end: true, permission: "customers.view" },
  { label: "Leads", href: "/crm/leads", end: false, permission: "leads.view" },
  { label: "Contacts", href: "/crm/contacts", end: false, permission: "contacts.view" },
] as const;

export function CrmTabs() {
  const { hasPermission } = usePermission();
  const visibleTabs = tabs.filter((tab) => hasPermission(tab.permission));

  return (
    <nav className="inline-flex w-fit items-center rounded-lg border border-border bg-muted/30 p-1" aria-label="CRM navigation">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "bg-background text-foreground shadow-sm"
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
