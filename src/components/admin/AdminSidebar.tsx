import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  HeadphonesIcon,
  ScrollText,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdminSidebarProps {
  className?: string;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Clientes", href: "/admin/clients" },
  { icon: HeadphonesIcon, label: "Suporte", href: "/admin/support" },
  { icon: ScrollText, label: "Logs & Auditoria", href: "/admin/logs" },
];

export function AdminSidebar({ className }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <span className="text-base font-semibold text-gray-900">Clean Flow</span>
              <p className="text-xs text-gray-500">Portal Admin</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
            isCollapsed && "mx-auto"
          )}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/admin" && location.pathname.startsWith(item.href));
          
          return (
            <Button
              key={item.href}
              variant="ghost"
              onClick={() => navigate(item.href)}
              className={cn(
                "w-full justify-start text-left h-11 transition-all duration-200 rounded-lg font-medium",
                isActive 
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700" 
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                isCollapsed ? "px-3" : "px-4"
              )}
            >
              <item.icon 
                className={cn(
                  "w-5 h-5 transition-colors",
                  isCollapsed ? "mx-auto" : "mr-3",
                  isActive ? "text-white" : "text-gray-500"
                )} 
              />
              {!isCollapsed && (
                <span className="text-sm">{item.label}</span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Footer - User Info */}
      <div className="p-3 border-t border-gray-100">
        <div 
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">AD</span>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Administrador</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
