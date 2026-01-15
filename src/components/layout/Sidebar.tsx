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
import { useLanguage } from "@/contexts/LanguageContext";

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
  { icon: Calendar, labelKey: "sidebar.schedule", href: "/schedule", permission: "view_schedule" },
  { icon: Users, labelKey: "sidebar.customers", href: "/customers", permission: "view_customers" },
  { 
    icon: Calculator, 
    labelKey: "sidebar.accounting",
    submenu: [
      { labelKey: "sidebar.transactions", href: "/transactions", icon: ArrowRightLeft, permission: "view_transactions" },
      { labelKey: "sidebar.invoices", href: "/invoices", icon: DollarSign, permission: "view_invoices" },
      { labelKey: "sidebar.leads", href: "/leads", icon: ClipboardList, permission: "view_leads" },
      { labelKey: "sidebar.payroll", href: "/payroll", icon: Wallet, permission: "view_payroll" },
    ]
  },
  { icon: Phone, labelKey: "sidebar.communications", href: "/communications", permission: "view_communications" },
  { icon: BarChart3, labelKey: "sidebar.reports", href: "/reports", permission: "view_reports" },
  { icon: Settings, labelKey: "sidebar.settings", href: "/settings", permission: "view_system_settings" },
  { icon: HelpCircle, labelKey: "sidebar.support", href: "/support" },
];

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>("sidebar.accounting");
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermission();
  const { t } = useLanguage();

  // Filter navigation items based on permissions
  const filteredNavigationItems = useMemo(() => {
    return navigationItems
      .map(item => {
        // If item has no permission requirement, show it
        if (!item.permission && !item.submenu) {
          return item;
        }

        // If item has submenu, filter submenu items
        if (item.submenu) {
          const filteredSubmenu = item.submenu.filter(
            sub => !sub.permission || hasPermission(sub.permission)
          );
          // Only show parent if at least one submenu item is visible
          if (filteredSubmenu.length === 0) return null;
          return { ...item, submenu: filteredSubmenu };
        }

        // Check permission for regular items
        if (item.permission && !hasPermission(item.permission)) {
          return null;
        }

        return item;
      })
      .filter((item): item is NavItem => item !== null);
  }, [hasPermission]);

  const isActiveRoute = (item: NavItem) => {
    if (item.href) {
      return location.pathname === item.href;
    }
    if (item.submenu) {
      return item.submenu.some(sub => location.pathname === sub.href);
    }
    return false;
  };

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen bg-surface shadow-xl border-r border-border transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">CleanPro</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredNavigationItems.map((item) => {
          const label = t(item.labelKey);
          
          if (item.submenu) {
            const isOpen = openSubmenu === item.labelKey;
            
            return (
              <Collapsible
                key={item.labelKey}
                open={isOpen}
                onOpenChange={(open) => setOpenSubmenu(open ? item.labelKey : null)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left h-12 transition-all duration-200",
                      "hover:bg-primary/10 hover:text-primary",
                      isActiveRoute(item) && "bg-primary/10 text-primary border-r-2 border-primary",
                      isCollapsed ? "px-3" : "px-4"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isCollapsed ? "mx-auto" : "mr-3")} />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium flex-1">{label}</span>
                        <ChevronDown className={cn(
                          "w-4 h-4 ml-auto transition-transform duration-200",
                          isOpen && "rotate-180"
                        )} />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                {!isCollapsed && (
                  <CollapsibleContent className="pl-4 space-y-1 mt-1">
                    {item.submenu.map((subItem) => (
                      <Button
                        key={subItem.href}
                        variant="ghost"
                        onClick={() => navigate(subItem.href)}
                        className={cn(
                          "w-full justify-start text-left h-10 transition-all duration-200",
                          "hover:bg-primary/10 hover:text-primary",
                          location.pathname === subItem.href && "bg-primary/10 text-primary"
                        )}
                      >
                        <subItem.icon className="w-4 h-4 mr-3" />
                        <span className="text-sm">{t(subItem.labelKey)}</span>
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
                "w-full justify-start text-left h-12 transition-all duration-200",
                "hover:bg-primary/10 hover:text-primary",
                location.pathname === item.href && "bg-primary/10 text-primary border-r-2 border-primary",
                isCollapsed ? "px-3" : "px-4"
              )}
            >
              <item.icon className={cn("w-5 h-5", isCollapsed ? "mx-auto" : "mr-3")} />
              {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground text-center">
            CleanPro v1.0
          </div>
        )}
      </div>
    </div>
  );
}
