import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Customers", href: "/crm", end: true },
  { label: "Leads", href: "/crm/leads", end: false },
  { label: "Contacts", href: "/crm/contacts", end: false },
] as const;

export function CrmTabs() {
  return (
    <nav className="flex w-full items-center gap-1 border-b border-border/70" aria-label="CRM navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive && "text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
