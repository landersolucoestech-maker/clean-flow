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
    <div className={cn("relative flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-200", isCollapsed ? "w-[68px]" : "w-60", className)}>
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
        {!isCollapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
              <ClipboardList className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="truncate whitespace-nowrap">
                <span className="text-base font-bold tracking-tight text-foreground">CLEAN </span>
                <span className="text-base font-bold tracking-tight text-primary">FLOW</span>
              </div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("sidebar.operations")}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto h-8 w-8 rounded-lg text-muted-foreground" aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-2.5">
        {filteredNavigationItems.map((item) => {
          const label = item.label ?? t(item.labelKey);
          const activeItem = isActiveRoute(item);

          if (item.submenu) {
            const isOpen = openSubmenu === item.labelKey;
            return (
              <Collapsible key={item.labelKey} open={isOpen} onOpenChange={(open) => setOpenSubmenu(open ? item.labelKey : null)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className={cn("h-10 w-full justify-start rounded-lg px-3 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-primary", activeItem && "bg-sidebar-accent font-semibold text-primary", isCollapsed && "justify-center px-0")}>
                    <item.icon className="h-[17px] w-[17px]" />
                    {!isCollapsed && <><span className="ml-3 flex-1 text-sm">{label}</span><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} /></>}
                  </Button>
                </CollapsibleTrigger>
                {!isCollapsed && (
                  <CollapsibleContent className="mt-1 space-y-0.5 pl-3">
                    {item.submenu.map((subItem) => (
                      <Button key={subItem.href} variant="ghost" onClick={() => navigate(subItem.href)} className={cn("h-8 w-full justify-start rounded-lg px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-primary", location.pathname === subItem.href && "bg-sidebar-accent font-semibold text-primary")}>
                        <subItem.icon className="mr-2.5 h-3.5 w-3.5" />
                        <span>{subItem.label ?? t(subItem.labelKey)}</span>
                      </Button>
                    ))}
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          }

          return (
            <Button key={item.labelKey} variant="ghost" onClick={() => item.href && navigate(item.href)} className={cn("h-10 w-full justify-start rounded-lg px-3 text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-primary", activeItem && "bg-sidebar-accent font-semibold text-primary", isCollapsed && "justify-center px-0")}>
              <item.icon className="h-[17px] w-[17px]" />
              {!isCollapsed && <span className="ml-3 text-sm">{label}</span>}
            </Button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2.5">
        {!isCollapsed && (
          <div className="rounded-lg bg-surface-muted px-3 py-2">
            <p className="text-xs font-semibold text-foreground">Clean Flow</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{t("sidebar.tagline")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
