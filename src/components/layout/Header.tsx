import { User, LogOut, Settings, UserCircle, Building2 } from "lucide-react";
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
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCurrentStaff } from "@/hooks/useStaff";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { t } = useLanguage();
  const { data: companySettings } = useCompanySettings();
  const { data: currentStaff } = useCurrentStaff();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="bg-surface shadow-md border-b border-border h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">
          {companySettings?.trade_name || companySettings?.legal_name || "Clean Flow"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        {/* Language Switcher */}
        <LanguageSwitcher />

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
                <p className="text-sm font-medium text-foreground">{currentStaff?.name || t("header.profile")}</p>
                <p className="text-xs text-muted-foreground">{currentStaff?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate("/settings?tab=profile")}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t("header.profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => navigate("/settings?tab=company")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("header.settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onSelect={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("header.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
