import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Customers", href: "/crm", end: true },
  { label: "Leads", href: "/crm/leads", end: false },
  { label: "Contacts", href: "/crm/contacts", end: false },
] as const;

export function CrmTabs() {
  return (
    <nav
      className="inline-flex w-fit items-center rounded-md border border-border bg-muted/30 p-1"
      aria-label="CRM navigation"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "rounded-sm px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
