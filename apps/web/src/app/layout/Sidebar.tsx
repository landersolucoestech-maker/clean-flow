import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePermission } from "@/hooks/usePermission";
import { useLanguage } from "@/contexts/useLanguage";

interface SidebarProps { className?: string; }
interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  label?: string;
  href?: string;
  permission?: string;
  submenu?: { labelKey: string; label?: string; href: string; icon: React.ComponentType<{ className?: string }>; permission?: string }[];
}

const navigationItems: NavItem[] = [
  { icon: Home, labelKey: "sidebar.dashboard", href: "/" },
  { icon: Calendar, labelKey: "sidebar.schedule", href: "/schedule", permission: "schedule.view" },
  { icon: Users, labelKey: "sidebar.crm", label: "CRM", href: "/crm" },
  {
    icon: Calculator,
    labelKey: "sidebar.accounting",
    submenu: [
      { labelKey: "sidebar.transactions", href: "/transactions", icon: ArrowRightLeft, permission: "transactions.view" },
      { labelKey: "sidebar.invoices", href: "/invoices", icon: DollarSign, permission: "invoices.view" },
      { labelKey: "sidebar.payroll", href: "/payroll", icon: Wallet, permission: "payroll.view" },
    ],
  },
  { icon: Phone, labelKey: "sidebar.communications", href: "/communications", permission: "communications.view" },
  { icon: BarChart3, labelKey: "sidebar.reports", href: "/reports", permission: "reports.view" },
  { icon: Settings, labelKey: "sidebar.settings", href: "/settings", permission: "settings.profile.view" },
  { icon: HelpCircle, labelKey: "sidebar.support", href: "/support" },
];

const navBase = "group flex w-full items-center rounded-md text-left text-sidebar-foreground transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar";
const navIdle = "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const navActive = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermission();
  const { t } = useLanguage();

  const filteredNavigationItems = useMemo(() => navigationItems.map((item) => {
    if (!item.permission && !item.submenu) return item;
    if (item.submenu) {
      const filteredSubmenu = item.submenu.filter((sub) => !sub.permission || hasPermission(sub.permission));
      return filteredSubmenu.length ? { ...item, submenu: filteredSubmenu } : null;
    }
    return item.permission && !hasPermission(item.permission) ? null : item;
  }).filter((item): item is NavItem => item !== null), [hasPermission]);

  const isActiveRoute = (item: NavItem) => {
    if (item.href === "/crm") return location.pathname.startsWith("/crm");
    if (item.href) return location.pathname === item.href;
    return item.submenu?.some((sub) => location.pathname === sub.href) ?? false;
  };

  return (
    <aside className={cn("relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-[width] duration-150", isCollapsed ? "w-14" : "w-56", className)}>
      <div className="flex h-14 items-center border-b border-sidebar-border px-2.5">
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate whitespace-nowrap text-[13px] font-semibold tracking-wide text-sidebar-foreground">
                CLEAN <span className="text-sidebar-primary">FLOW</span>
              </div>
              <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/60">{t("sidebar.operations")}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", isCollapsed && "mx-auto")}
          aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-2.5">
        {filteredNavigationItems.map((item) => {
          const label = item.label ?? t(item.labelKey);
          const activeItem = isActiveRoute(item);

          if (item.submenu) {
            const isOpen = openSubmenu === item.labelKey;
            return (
              <Collapsible key={item.labelKey} open={isOpen} onOpenChange={(open) => setOpenSubmenu(open ? item.labelKey : null)}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={cn(navBase, "h-9 px-2.5 text-[13px]", activeItem ? navActive : navIdle, isCollapsed && "justify-center px-0")}>
                    <item.icon className="h-4 w-4 shrink-0 text-current" />
                    {!isCollapsed && (
                      <>
                        <span className="ml-2.5 min-w-0 flex-1 truncate">{label}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60 transition-transform", isOpen && "rotate-180")} />
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
                {!isCollapsed && (
                  <CollapsibleContent className="mt-0.5 space-y-0.5 pl-5">
                    {item.submenu.map((subItem) => {
                      const subActive = location.pathname === subItem.href;
                      return (
                        <button
                          type="button"
                          key={subItem.href}
                          onClick={() => navigate(subItem.href)}
                          className={cn(navBase, "h-8 px-2.5 text-xs", subActive ? navActive : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
                        >
                          <subItem.icon className="mr-2 h-3.5 w-3.5 shrink-0 text-current" />
                          <span className="truncate">{subItem.label ?? t(subItem.labelKey)}</span>
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          }

          return (
            <button
              type="button"
              key={item.labelKey}
              onClick={() => item.href && navigate(item.href)}
              className={cn(navBase, "h-9 px-2.5 text-[13px]", activeItem ? navActive : navIdle, isCollapsed && "justify-center px-0")}
            >
              <item.icon className="h-4 w-4 shrink-0 text-current" />
              {!isCollapsed && <span className="ml-2.5 truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="border-t border-sidebar-border px-3 py-2.5">
          <p className="text-[10px] leading-4 text-sidebar-foreground/55">{t("sidebar.tagline")}</p>
        </div>
      )}
    </aside>
  );
}
