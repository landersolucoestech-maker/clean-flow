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
import { useLanguage } from "@/contexts/useLanguage";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCurrentStaff } from "@/hooks/useStaff";
import { signOut } from "@/modules/auth/services/authService";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { t } = useLanguage();
  const { data: companySettings } = useCompanySettings();
  const { data: currentStaff } = useCurrentStaff();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <p className="truncate text-sm font-semibold text-foreground">
            {companySettings?.trade_name || companySettings?.legal_name || "Clean Flow"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 sm:px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-light text-primary-dark">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden max-w-40 text-left sm:block">
                <p className="truncate text-xs font-semibold text-foreground">{currentStaff?.name || t("header.profile")}</p>
                <p className="truncate text-[11px] text-muted-foreground">{currentStaff?.email || ""}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-xl border border-border bg-popover p-2 shadow-lg" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1 px-1 py-1">
                <p className="text-sm font-semibold text-foreground">{currentStaff?.name || t("header.profile")}</p>
                <p className="text-xs text-muted-foreground">{currentStaff?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => navigate("/settings?tab=profile")}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t("header.profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => navigate("/settings?tab=company")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("header.settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer rounded-lg text-destructive focus:text-destructive" onSelect={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("header.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
