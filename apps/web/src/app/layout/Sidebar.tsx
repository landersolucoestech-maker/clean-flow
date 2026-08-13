import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Home,
  Phone,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Calculator,
  ArrowRightLeft,
  HelpCircle,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePermission } from "@/hooks/usePermission";
import { useLanguage } from "@/contexts/useLanguage";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href?: string;
  permission?: string;
  submenu?: {
    labelKey: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    permission?: string;
  }[];
}

const navigationItems: NavItem[] = [
  { icon: Home, labelKey: "sidebar.dashboard", href: "/" },
  { icon: Calendar, labelKey: "sidebar.schedule", href: "/schedule", permission: "schedule.view" },
  { icon: Users, labelKey: "sidebar.customers", href: "/customers", permission: "customers.view" },
  {
    icon: Calculator,
    labelKey: "sidebar.accounting",
    submenu: [
      { labelKey: "sidebar.transactions", href: "/transactions", icon: ArrowRightLeft, permission: "transactions.view" },
      { labelKey: "sidebar.invoices", href: "/invoices", icon: DollarSign, permission: "invoices.view" },
      { labelKey: "sidebar.leads", href: "/leads", icon: ClipboardList, permission: "leads.view" },
      { labelKey: "sidebar.payroll", href: "/payroll", icon: Wallet, permission: "payroll.view" },
    ],
  },
  { icon: Phone, labelKey: "sidebar.communications", href: "/communications", permission: "communications.view" },
  { icon: BarChart3, labelKey: "sidebar.reports", href: "/reports", permission: "reports.view" },
  { icon: Settings, labelKey: "sidebar.settings", href: "/settings", permission: "settings.profile.view" },
  { icon: HelpCircle, labelKey: "sidebar.support", href: "/support" },
];

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>("sidebar.accounting");
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermission();
  const { t } = useLanguage();

  const filteredNavigationItems = useMemo(() => {
    return navigationItems
      .map((item) => {
        if (!item.permission && !item.submenu) return item;
        if (item.submenu) {
          const filteredSubmenu = item.submenu.filter((sub) => !sub.permission || hasPermission(sub.permission));
          if (filteredSubmenu.length === 0) return null;
          return { ...item, submenu: filteredSubmenu };
        }
        if (item.permission && !hasPermission(item.permission)) return null;
        return item;
      })
      .filter((item): item is NavItem => item !== null);
  }, [hasPermission]);

  const isActiveRoute = (item: NavItem) => {
    if (item.href) return location.pathname === item.href;
    if (item.submenu) return item.submenu.some((sub) => location.pathname === sub.href);
    return false;
  };

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-200",
        isCollapsed ? "w-20" : "w-64",
        className,
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary-dark">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">CLEAN </span>
              <span className="text-lg font-bold tracking-tight text-primary">FLOW</span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operations</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto rounded-xl text-muted-foreground">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-3">
        {filteredNavigationItems.map((item) => {
          const label = t(item.labelKey);
          const activeItem = isActiveRoute(item);

          if (item.submenu) {
            const isOpen = openSubmenu === item.labelKey;
            return (
              <Collapsible key={item.labelKey} open={isOpen} onOpenChange={(open) => setOpenSubmenu(open ? item.labelKey : null)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-11 w-full justify-start rounded-xl px-3 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-primary",
                      activeItem && "bg-sidebar-accent font-semibold text-primary",
                      isCollapsed && "justify-center px-0",
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    {!isCollapsed && (
                      <>
                        <span className="ml-3 flex-1 text-sm">{label}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                {!isCollapsed && (
                  <CollapsibleContent className="mt-1 space-y-1 pl-4">
                    {item.submenu.map((subItem) => (
                      <Button
                        key={subItem.href}
                        variant="ghost"
                        onClick={() => navigate(subItem.href)}
                        className={cn(
                          "h-9 w-full justify-start rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-primary",
                          location.pathname === subItem.href && "bg-sidebar-accent font-semibold text-primary",
                        )}
                      >
                        <subItem.icon className="mr-3 h-4 w-4" />
                        <span>{t(subItem.labelKey)}</span>
                      </Button>
                    ))}
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          }

          return (
            <Button
              key={item.labelKey}
              variant="ghost"
              onClick={() => item.href && navigate(item.href)}
              className={cn(
                "h-11 w-full justify-start rounded-xl px-3 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-primary",
                location.pathname === item.href && "bg-sidebar-accent font-semibold text-primary",
                isCollapsed && "justify-center px-0",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {!isCollapsed && <span className="ml-3 text-sm">{label}</span>}
            </Button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!isCollapsed && (
          <div className="rounded-xl bg-surface-muted px-3 py-2.5">
            <p className="text-xs font-semibold text-foreground">Clean Flow</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Clean spaces. Better flow.</p>
          </div>
        )}
      </div>
    </div>
  );
}
