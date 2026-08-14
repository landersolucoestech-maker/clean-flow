import type { ReactNode } from "react";
import { User, LogOut, Settings, UserCircle, Building2, UsersRound } from "lucide-react";
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
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  actions?: ReactNode;
}

export function Header({ actions }: HeaderProps) {
  const { t } = useLanguage();
  const { data: companySettings } = useCompanySettings();
  const { data: currentStaff } = useCurrentStaff();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrm = location.pathname === "/crm" || location.pathname.startsWith("/crm/");
  const HeaderIcon = isCrm ? UsersRound : Building2;

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border/70 bg-card/95 px-4 py-2 backdrop-blur sm:px-5 lg:px-6 xl:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
          <HeaderIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          {isCrm ? (
            <>
              <p className="truncate text-sm font-semibold leading-tight text-foreground">CRM</p>
              <p className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">Centralize customer relationships and opportunities.</p>
            </>
          ) : (
            <>
              <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">Workspace</p>
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {companySettings?.trade_name || companySettings?.legal_name || "Clean Flow"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {actions && <div className="flex min-w-0 items-center gap-2">{actions}</div>}
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 rounded-lg px-1.5 sm:px-2.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary-light text-primary-dark">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden max-w-36 text-left lg:block">
                <p className="truncate text-xs font-semibold leading-tight text-foreground">{currentStaff?.name || t("header.profile")}</p>
                <p className="truncate text-[10px] leading-tight text-muted-foreground">{currentStaff?.email || ""}</p>
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
