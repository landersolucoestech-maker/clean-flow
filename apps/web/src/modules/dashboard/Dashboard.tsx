import { PageLayout } from "@/components/layout/PageLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingJobs } from "@/components/dashboard/UpcomingJobs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useJobs } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { useCurrentStaff } from "@/hooks/useStaff";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export function Dashboard() {
  const { t } = useLanguage();
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

    const currentMonthRevenue = currentMonthInvoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const lastMonthRevenue = lastMonthInvoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + (invoice.total || 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : currentMonthRevenue > 0 ? "+100" : "0";

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
    const growthRate = totalLastMonth > 0
      ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth * 100).toFixed(0)
      : totalCurrentMonth > 0 ? "100" : "0";

    return {
      monthlyRevenue: currentMonthRevenue,
      revenueChange,
      activeCustomers,
      newCustomersThisMonth,
      jobsThisWeek: jobsThisWeek.length,
      completedThisWeek,
      pendingThisWeek,
      growthRate,
    };
  }, [jobs, customers, invoices]);

  const formatCurrency = (value: number) => new Intl.NumberFormat(companySettings?.locale || "en-US", {
    style: "currency",
    currency: companySettings?.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <PageLayout>
      <section className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Overview</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("dashboard.welcome")}{currentStaff?.name ? `, ${currentStaff.name}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </section>

      <section className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canViewFinancials ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
        {canViewFinancials && (
          <StatsCard
            title={t("dashboard.monthlyRevenue")}
            value={formatCurrency(stats.monthlyRevenue)}
            change={`${Number(stats.revenueChange) >= 0 ? "+" : ""}${stats.revenueChange}% ${t("dashboard.fromLastMonth")}`}
            changeType={Number(stats.revenueChange) >= 0 ? "positive" : "negative"}
            icon={<DollarSign className="h-5 w-5 text-primary" />}
          />
        )}
        <StatsCard
          title={t("dashboard.activeCustomers")}
          value={String(stats.activeCustomers)}
          change={`+${stats.newCustomersThisMonth} ${t("dashboard.newThisMonth")}`}
          changeType="positive"
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title={t("dashboard.jobsThisWeek")}
          value={String(stats.jobsThisWeek)}
          change={`${stats.completedThisWeek} ${t("dashboard.completed")}, ${stats.pendingThisWeek} ${t("payroll.pending").toLowerCase()}`}
          changeType="neutral"
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
        {canViewFinancials && (
          <StatsCard
            title={t("dashboard.growthRate")}
            value={`${stats.growthRate}%`}
            change={`${Number(stats.growthRate) >= 0 ? "+" : ""}${stats.growthRate}% ${t("dashboard.fromLastMonth")}`}
            changeType={Number(stats.growthRate) >= 0 ? "positive" : "negative"}
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
          />
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RecentActivity includeInvoices={canViewFinancials} />
        <UpcomingJobs />
      </section>
    </PageLayout>
  );
}
