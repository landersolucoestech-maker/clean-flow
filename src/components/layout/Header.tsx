import { Bell, User, LogOut, Settings, UserCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function Header() {
  const { t } = useLanguage();
  const { data: companySettings } = useCompanySettings();

  const notifications = [
    {
      id: 1,
      title: t("header.newAppointment"),
      description: "Customer Maria Silva scheduled cleaning for tomorrow",
      time: `5 ${t("header.minAgo")}`,
      unread: true,
    },
    {
      id: 2,
      title: t("header.paymentReceived"),
      description: "Payment of $250 confirmed",
      time: `1 ${t("header.hourAgo")}`,
      unread: true,
    },
    {
      id: 3,
      title: t("header.jobCompleted"),
      description: "Team Alpha finished the service",
      time: `2 ${t("header.hoursAgo")}`,
      unread: true,
    },
  ];

  return (
    <header className="bg-surface shadow-md border-b border-border h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">
          {companySettings?.trade_name || "Company Name"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Notifications Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.filter(n => n.unread).length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-popover border border-border" align="end">
            <div className="p-4 border-b border-border">
              <h4 className="font-semibold text-foreground">{t("header.notifications")}</h4>
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                    notification.unread ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <Button variant="ghost" className="w-full text-sm">
                {t("header.viewAllNotifications")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover border border-border" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-foreground">Admin</p>
                <p className="text-xs text-muted-foreground">admin@company.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t("header.profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("header.settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("header.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
