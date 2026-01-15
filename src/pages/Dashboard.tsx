import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingJobs } from "@/components/dashboard/UpcomingJobs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useJobs } from "@/hooks/useJobs";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { useMemo } from "react";

export function Dashboard() {
  const { t } = useLanguage();
  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();

  // Calculate real stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Monthly revenue from paid invoices
    const currentMonthInvoices = invoices.filter(inv => {
      if (!inv.issue_date) return false;
      const d = new Date(inv.issue_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const lastMonthInvoices = invoices.filter(inv => {
      if (!inv.issue_date) return false;
      const d = new Date(inv.issue_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const currentMonthRevenue = currentMonthInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const lastMonthRevenue = lastMonthInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const revenueChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : currentMonthRevenue > 0 ? "+100" : "0";

    // Active customers
    const activeCustomers = customers.filter(c => c.status === 'Active').length;
    const newCustomersThisMonth = customers.filter(c => {
      if (!c.customer_since) return false;
      const d = new Date(c.customer_since);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Jobs this week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const jobsThisWeek = jobs.filter(job => {
      if (!job.scheduled_date) return false;
      const d = new Date(job.scheduled_date);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const completedThisWeek = jobsThisWeek.filter(j => j.status === 'completed').length;
    const pendingThisWeek = jobsThisWeek.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;

    // Growth rate (compare total revenue current vs last month)
    const totalCurrentMonth = currentMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalLastMonth = lastMonthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("dashboard.welcome")}, Admin!
            </h1>
            <p className="text-muted-foreground">
              {t("dashboard.subtitle")}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard 
              title={t("dashboard.monthlyRevenue")} 
              value={formatCurrency(stats.monthlyRevenue)} 
              change={`${Number(stats.revenueChange) >= 0 ? '+' : ''}${stats.revenueChange}% ${t("dashboard.fromLastMonth")}`} 
              changeType={Number(stats.revenueChange) >= 0 ? "positive" : "negative"} 
              icon={<DollarSign className="w-6 h-6 text-primary" />} 
            />
            <StatsCard 
              title={t("dashboard.activeCustomers")} 
              value={String(stats.activeCustomers)} 
              change={`+${stats.newCustomersThisMonth} ${t("dashboard.newThisMonth")}`} 
              changeType="positive" 
              icon={<Users className="w-6 h-6 text-primary" />} 
            />
            <StatsCard 
              title={t("dashboard.jobsThisWeek")} 
              value={String(stats.jobsThisWeek)} 
              change={`${stats.completedThisWeek} ${t("dashboard.completed")}, ${stats.pendingThisWeek} ${t("payroll.pending").toLowerCase()}`} 
              changeType="neutral" 
              icon={<Calendar className="w-6 h-6 text-primary" />} 
            />
            <StatsCard 
              title={t("dashboard.growthRate")} 
              value={`${stats.growthRate}%`} 
              change={`${Number(stats.growthRate) >= 0 ? '+' : ''}${stats.growthRate}% ${t("dashboard.fromLastMonth")}`} 
              changeType={Number(stats.growthRate) >= 0 ? "positive" : "negative"} 
              icon={<TrendingUp className="w-6 h-6 text-primary" />} 
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity />
            <UpcomingJobs />
          </div>
        </main>
      </div>
    </div>
  );
}
