import { T } from "@/shared/components/i18n/T";
import { PageLayout } from "@/components/layout/PageLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingJobs } from "@/components/dashboard/UpcomingJobs";
import { useLanguage } from "@/contexts/useLanguage";
import { useJobs } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { useCurrentStaff } from "@/hooks/useStaff";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export function Dashboard() {
  const { t, locale } = useLanguage();
  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: currentStaff } = useCurrentStaff();
  const { data: companySettings } = useCompanySettings();
  const currentRole = currentStaff?.staff_roles?.role;
  const canViewFinancials = currentRole === "admin" || currentRole === "office_manager";
  const { data: invoices = [] } = useInvoices(canViewFinancials);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const currentMonthInvoices = invoices.filter((invoice) => {
      if (!invoice.issue_date) return false;
      const date = new Date(invoice.issue_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const lastMonthInvoices = invoices.filter((invoice) => {
      if (!invoice.issue_date) return false;
      const date = new Date(invoice.issue_date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
    const currentMonthRevenue = currentMonthInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const lastMonthRevenue = lastMonthInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const revenueChange = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : currentMonthRevenue > 0 ? "+100" : "0";
    const activeCustomers = customers.filter((customer) => customer.status === "Active").length;
    const newCustomersThisMonth = customers.filter((customer) => {
      if (!customer.customer_since) return false;
      const date = new Date(customer.customer_since);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const jobsThisWeek = jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      const date = new Date(job.scheduled_date);
      return date >= startOfWeek && date <= endOfWeek;
    });
    const completedThisWeek = jobsThisWeek.filter((job) => job.status === "completed").length;
    const pendingThisWeek = jobsThisWeek.filter((job) => job.status !== "completed" && job.status !== "cancelled").length;
    const totalCurrentMonth = currentMonthInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const totalLastMonth = lastMonthInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const growthRate = totalLastMonth > 0 ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth * 100).toFixed(0) : totalCurrentMonth > 0 ? "100" : "0";
    return { monthlyRevenue: currentMonthRevenue, revenueChange, activeCustomers, newCustomersThisMonth, jobsThisWeek: jobsThisWeek.length, completedThisWeek, pendingThisWeek, growthRate };
  }, [jobs, customers, invoices]);

  const formatCurrency = (value: number) => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: companySettings?.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <PageLayout>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t("dashboard.welcome")}{currentStaff?.name ? `, ${currentStaff.name}` : ""}.</span>{" "}
          {t("dashboard.subtitle")}
        </p>
        <p className="hidden shrink-0 text-[11px] text-muted-foreground xl:block"><T k="literal.dashboard.operational_snapshot_for_your_cleaning_busin.2e9ea692" /></p>
      </div>

      <section className="space-y-2.5">
        <div className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${canViewFinancials ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
          {canViewFinancials && <StatsCard title={t("dashboard.monthlyRevenue")} value={formatCurrency(stats.monthlyRevenue)} change={`${Number(stats.revenueChange) >= 0 ? "+" : ""}${stats.revenueChange}% ${t("dashboard.fromLastMonth")}`} changeType={Number(stats.revenueChange) >= 0 ? "positive" : "negative"} icon={<DollarSign className="h-4 w-4 text-primary" />} />}
          <StatsCard title={t("dashboard.activeCustomers")} value={String(stats.activeCustomers)} change={`+${stats.newCustomersThisMonth} ${t("dashboard.newThisMonth")}`} changeType="positive" icon={<Users className="h-4 w-4 text-primary" />} />
          <StatsCard title={t("dashboard.jobsThisWeek")} value={String(stats.jobsThisWeek)} change={`${stats.completedThisWeek} ${t("dashboard.completed")}, ${stats.pendingThisWeek} ${t("payroll.pending").toLowerCase()}`} changeType="neutral" icon={<Calendar className="h-4 w-4 text-primary" />} />
          {canViewFinancials && <StatsCard title={t("dashboard.growthRate")} value={`${stats.growthRate}%`} change={`${Number(stats.growthRate) >= 0 ? "+" : ""}${stats.growthRate}% ${t("dashboard.fromLastMonth")}`} changeType={Number(stats.growthRate) >= 0 ? "positive" : "negative"} icon={<TrendingUp className="h-4 w-4 text-primary" />} />}
        </div>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.04em] text-foreground"><T k="sidebar.operations" /></h2>
          <p className="hidden text-[11px] text-muted-foreground sm:block"><T k="literal.dashboard.recent_activity_and_upcoming_work.f87c5c99" /></p>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <RecentActivity includeInvoices={canViewFinancials} />
          <UpcomingJobs />
        </div>
      </section>
    </PageLayout>
  );
}