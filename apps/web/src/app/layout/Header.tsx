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
  { match: (path: string) => path === "/", title: "Dashboard", description: "Business overview and daily operations.", icon: Building2 },
  { match: (path: string) => path.startsWith("/schedule"), title: "Schedule", description: "Jobs, appointments and team availability.", icon: CalendarDays },
  { match: (path: string) => path.startsWith("/crm"), title: "CRM", description: "Customers, leads and business contacts.", icon: UsersRound },
  { match: (path: string) => path.startsWith("/transactions"), title: "Transactions", description: "Cash flow, income and expenses.", icon: ArrowRightLeft },
  { match: (path: string) => path.startsWith("/invoices"), title: "Invoices", description: "Billing, payments and financial records.", icon: CreditCard },
  { match: (path: string) => path.startsWith("/payroll"), title: "Payroll", description: "Team compensation and payroll periods.", icon: WalletCards },
  { match: (path: string) => path.startsWith("/communications"), title: "Communications", description: "Unified customer conversations and channels.", icon: MessageSquareText },
  { match: (path: string) => path.startsWith("/reports"), title: "Reports", description: "Operational and financial performance.", icon: BarChart3 },
  { match: (path: string) => path.startsWith("/settings") || path.startsWith("/integrations"), title: "Settings", description: "Company preferences, integrations and access.", icon: SlidersHorizontal },
  { match: (path: string) => path.startsWith("/support"), title: "Help & Support", description: "Support resources and assistance.", icon: CircleHelp },
] as const;

export function Header({ actions }: HeaderProps) {
  const { t } = useLanguage();
  const { data: currentStaff } = useCurrentStaff();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meta = pageMeta.find((item) => item.match(pathname)) ?? {
    title: "Clean Flow",
    description: "Operations workspace.",
    icon: Building2,
  };
  const HeaderIcon = meta.icon;

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-2 backdrop-blur sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <HeaderIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">{meta.title}</p>
          <p className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">{meta.description}</p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {actions && <div className="flex min-w-0 items-center gap-2">{actions}</div>}
        <LanguageSwitcher />
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
    </header>
  );
}
