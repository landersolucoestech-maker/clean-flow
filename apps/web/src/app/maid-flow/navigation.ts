import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  ReceiptText,
  Settings,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  label?: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    items: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
  {
    label: "CRM",
    items: [
      { label: "Contacts", path: "/crm/contacts", icon: ContactRound },
      { label: "Customers", path: "/crm/customers", icon: UsersRound },
      { label: "Leads", path: "/crm/leads", icon: Megaphone },
      { label: "Estimates", path: "/crm/estimates", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Schedule", path: "/operations/schedule", icon: CalendarDays },
      { label: "Jobs", path: "/operations/jobs", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Communications",
    items: [{ label: "Inbox", path: "/communications/inbox", icon: Inbox }],
  },
  {
    label: "Finance",
    items: [
      { label: "Invoices", path: "/finance/invoices", icon: ReceiptText },
      { label: "Payments", path: "/finance/payments", icon: WalletCards },
      { label: "Transactions", path: "/finance/transactions", icon: CircleDollarSign },
      { label: "Payroll", path: "/finance/payroll", icon: UsersRound },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", path: "/reports", icon: BarChart3 }],
  },
  {
    items: [
      { label: "Settings", path: "/settings", icon: Settings },
      { label: "Support", path: "/support", icon: LifeBuoy },
      { label: "Platform", path: "/platform", icon: ShieldCheck },
    ],
  },
];

export const allNavigationItems = navigationGroups.flatMap((group) => group.items);
