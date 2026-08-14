import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CircleHelp,
  CreditCard,
  LogOut,
  MessageSquareText,
  Settings,
  SlidersHorizontal,
  User,
  UserCircle,
  UsersRound,
  WalletCards,
} from "lucide-react";
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
import { useCurrentStaff } from "@/hooks/useStaff";
import { signOut } from "@/modules/auth/services/authService";
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  actions?: ReactNode;
}

const pageMeta = [
  { match: (path: string) => path === "/", titleKey: "page.dashboard.title", descriptionKey: "page.dashboard.description", icon: Building2 },
  { match: (path: string) => path.startsWith("/schedule"), titleKey: "page.schedule.title", descriptionKey: "page.schedule.description", icon: CalendarDays },
  { match: (path: string) => path.startsWith("/crm"), titleKey: "page.crm.title", descriptionKey: "page.crm.description", icon: UsersRound },
  { match: (path: string) => path.startsWith("/transactions"), titleKey: "page.transactions.title", descriptionKey: "page.transactions.description", icon: ArrowRightLeft },
  { match: (path: string) => path.startsWith("/invoices"), titleKey: "page.invoices.title", descriptionKey: "page.invoices.description", icon: CreditCard },
  { match: (path: string) => path.startsWith("/payroll"), titleKey: "page.payroll.title", descriptionKey: "page.payroll.description", icon: WalletCards },
  { match: (path: string) => path.startsWith("/communications"), titleKey: "page.communications.title", descriptionKey: "page.communications.description", icon: MessageSquareText },
  { match: (path: string) => path.startsWith("/reports"), titleKey: "page.reports.title", descriptionKey: "page.reports.description", icon: BarChart3 },
  { match: (path: string) => path.startsWith("/settings") || path.startsWith("/integrations"), titleKey: "page.settings.title", descriptionKey: "page.settings.description", icon: SlidersHorizontal },
  { match: (path: string) => path.startsWith("/support"), titleKey: "page.support.title", descriptionKey: "page.support.description", icon: CircleHelp },
] as const;

export function Header({ actions }: HeaderProps) {
  const { t } = useLanguage();
  const { data: currentStaff } = useCurrentStaff();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = pageMeta.find((item) => item.match(pathname));
  const HeaderIcon = meta?.icon ?? Building2;
  const pageTitle = meta ? t(meta.titleKey) : "Clean Flow";
  const pageDescription = meta ? t(meta.descriptionKey) : t("page.default.description");

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-border bg-card/95 px-4 py-2 backdrop-blur sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HeaderIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">{pageTitle}</p>
          <p className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">{pageDescription}</p>
        </div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {actions && (
          <div className="order-1 flex min-w-0 items-center gap-2 whitespace-nowrap">
            {actions}
          </div>
        )}

        <div className="order-2 shrink-0">
          <LanguageSwitcher />
        </div>

        <div className="order-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary"><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="hidden max-w-36 text-left lg:block">
                  <p className="truncate text-xs font-medium leading-tight text-foreground">{currentStaff?.name || t("header.profile")}</p>
                  <p className="truncate text-[10px] leading-tight text-muted-foreground">{currentStaff?.email || ""}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 rounded-md border border-border bg-popover p-1.5 shadow-md" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 px-1 py-1">
                  <p className="text-sm font-semibold text-foreground">{currentStaff?.name || t("header.profile")}</p>
                  <p className="text-xs text-muted-foreground">{currentStaff?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-sm" onSelect={() => navigate("/settings?tab=profile")}>
                <UserCircle className="mr-2 h-4 w-4" /><span>{t("header.profile")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-sm" onSelect={() => navigate("/settings?tab=company")}>
                <Settings className="mr-2 h-4 w-4" /><span>{t("header.settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-sm text-destructive focus:text-destructive" onSelect={() => void handleLogout()}>
                <LogOut className="mr-2 h-4 w-4" /><span>{t("header.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
