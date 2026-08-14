import { T } from "@/shared/components/i18n/T";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/shared/KPICard";
import {
  Trophy,
  TrendingUp,
  Users,
  UserPlus,
  RefreshCw,
  Briefcase,
  XCircle,
  Clock,
  CheckCircle,
  DollarSign,
  Receipt,
  PiggyBank,
  Percent,
  Loader2,
  Calendar,
  CalendarCheck,
  CalendarX,
  UserCog,
  Wallet,
  CreditCard,
  MessageSquare,
  Mail,
  Bell,
  Coins,
  Building,
  TrendingDown,
  Timer,
} from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useInvoices } from "@/hooks/useInvoices";
import { useTransactions } from "@/hooks/useTransactions";
import { useStaff } from "@/hooks/useStaff";
import { usePayrollRecords } from "@/hooks/usePayrollRecords";
import { useConversations } from "@/hooks/useConversations";
import { AIConsultantCard } from "./AIConsultantCard";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  percentile: number;
  marketAverage?: string;
  topPerformers?: string;
  insight?: string;
  status?: string;
  statusType?: "success" | "warning" | "info";
}

function MetricCard({
  icon,
  title,
  value,
  percentile,
  marketAverage,
  topPerformers,
  insight,
  status,
  statusType = "success",
}: MetricCardProps) {
  const getPercentileColor = (p: number) => {
    if (p >= 80) return "text-success";
    if (p >= 60) return "text-primary";
    if (p >= 40) return "text-warning-foreground";
    return "text-destructive";
  };

  const getProgressColor = (p: number) => {
    if (p >= 80) return "bg-success";
    if (p >= 60) return "bg-primary";
    if (p >= 40) return "bg-warning";
    return "bg-destructive";
  };

  const getStatusBadge = () => {
    if (!status) return null;
    const colors = {
      success: "bg-success/10 text-success border-success/20",
      warning: "bg-warning/10 text-warning-foreground border-warning/20",
      info: "bg-primary-light text-primary border-primary/20",
    };
    return (
      <Badge variant="outline" className={colors[statusType]}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-xl font-bold text-foreground mt-1">{value}</p>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Percentil</span>
                <span className={`font-semibold ${getPercentileColor(percentile)}`}>
                  {percentile}%
                </span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${getProgressColor(percentile)}`}
                  style={{ width: `${percentile}%` }}
                />
              </div>
            </div>

            {marketAverage && (
              <p className="text-xs text-muted-foreground mt-2">
                Média do mercado: <span className="font-medium">{marketAverage}</span>
              </p>
            )}
            {topPerformers && (
              <p className="text-xs text-muted-foreground">
                Top performers: <span className="font-medium">{topPerformers}</span>
              </p>
            )}
            {insight && (
              <p className="text-xs text-primary mt-2 font-medium">{insight}</p>
            )}
            {status && <div className="mt-2">{getStatusBadge()}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsTab() {
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: jobs = [], isLoading: isLoadingJobs } = useJobs();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions();
  const { data: staff = [], isLoading: isLoadingStaff } = useStaff();
  const { data: payrollRecords = [], isLoading: isLoadingPayroll } = usePayrollRecords();
  const { data: conversations = [], isLoading: isLoadingConversations } = useConversations();

  const isLoading = isLoadingCustomers || isLoadingJobs || isLoadingInvoices || 
                    isLoadingTransactions || isLoadingStaff || isLoadingPayroll || isLoadingConversations;

  // Calculate all metrics from real data
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // ========== CUSTOMER METRICS ==========
    const newClientsThisMonth = customers.filter(c => {
      if (!c.customer_since) return false;
      const d = new Date(c.customer_since);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const activeClients = customers.filter(c => c.status === 'Active').length;
    const totalCustomers = customers.length;

    const activeCustomers = customers.filter(c => c.status === 'Active');
    const recurringClients = activeCustomers.filter(c => 
      c.frequency && c.frequency !== 'one-time'
    ).length;
    const recurringRate = activeClients > 0 
      ? Math.min(100, Math.round((recurringClients / activeClients) * 100))
      : 0;

    // ========== JOB METRICS ==========
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const cancelledJobs = jobs.filter(j => j.status === 'cancelled').length;
    const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length;
    const inProgressJobs = jobs.filter(j => j.status === 'in-progress').length;
    const totalJobs = jobs.length;
    
    const cancellationRate = totalJobs > 0 
      ? Number(((cancelledJobs / totalJobs) * 100).toFixed(1))
      : 0;

    // On-time completion
    const jobsWithTime = jobs.filter(j => j.status === 'completed' && j.time_finished);
    const onTimeRate = completedJobs > 0 
      ? Math.round((jobsWithTime.length / completedJobs) * 100) 
      : 0;

    // Average completion time (in minutes)
    const jobsWithDuration = jobs.filter(j => j.duration_minutes && j.status === 'completed');
    const avgCompletionTime = jobsWithDuration.length > 0
      ? Math.round(jobsWithDuration.reduce((sum, j) => sum + (j.duration_minutes || 0), 0) / jobsWithDuration.length)
      : 0;

    // ========== SCHEDULE METRICS ==========
    const schedulesCreatedThisMonth = jobs.filter(j => {
      const d = new Date(j.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const schedulesCompletedThisMonth = jobs.filter(j => {
      if (j.status !== 'completed' || !j.scheduled_date) return false;
      const d = new Date(j.scheduled_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const schedulesCancelledThisMonth = jobs.filter(j => {
      if (j.status !== 'cancelled' || !j.scheduled_date) return false;
      const d = new Date(j.scheduled_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Conversion rate: scheduled -> completed
    const conversionRate = schedulesCreatedThisMonth > 0
      ? Math.round((schedulesCompletedThisMonth / schedulesCreatedThisMonth) * 100)
      : 0;

    // ========== FINANCIAL METRICS ==========
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const revenuePerJob = completedJobs > 0 
      ? Math.round(totalRevenue / completedJobs) 
      : 0;

    // Tips from transactions
    const tips = transactions
      .filter(t => t.category?.toLowerCase().includes('tip') || t.category?.toLowerCase().includes('gorjeta'))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // Expenses from transactions
    const expenseTransactions = transactions.filter(t => t.type === 'despesa');
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // Fixed expenses (categories like rent, salaries, etc.)
    const fixedCategories = ['aluguel', 'rent', 'salário', 'salary', 'seguro', 'insurance', 'assinatura', 'subscription'];
    const fixedExpenses = expenseTransactions
      .filter(t => fixedCategories.some(cat => t.category?.toLowerCase().includes(cat)))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const variableExpenses = totalExpenses - fixedExpenses;

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 
      ? Number(((netProfit / totalRevenue) * 100).toFixed(1))
      : 0;

    // ========== TEAM METRICS ==========
    const totalStaff = staff.length;
    const activeStaff = staff.filter(s => s.is_active).length;
    const inactiveStaff = staff.filter(s => !s.is_active).length;

    const totalPayroll = payrollRecords
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + Number(p.total), 0);

    const pendingPayroll = payrollRecords
      .filter(p => p.status === 'Pending')
      .reduce((sum, p) => sum + Number(p.total), 0);

    // Jobs per staff member
    const staffJobCounts: Record<string, number> = {};
    jobs.filter(j => j.status === 'completed').forEach(job => {
      if (job.staff_assigned && Array.isArray(job.staff_assigned)) {
        job.staff_assigned.forEach((staffName: string) => {
          staffJobCounts[staffName] = (staffJobCounts[staffName] || 0) + 1;
        });
      }
    });
    
    const avgJobsPerStaff = activeStaff > 0 
      ? Math.round(completedJobs / activeStaff)
      : 0;

    // Revenue per staff member
    const revenuePerStaff = activeStaff > 0
      ? Math.round(totalRevenue / activeStaff)
      : 0;

    // Payroll per staff member
    const payrollPerStaff = activeStaff > 0
      ? Math.round(totalPayroll / activeStaff)
      : 0;

    // ========== COMMUNICATION METRICS ==========
    const totalMessages = conversations.length;
    const unreadMessages = conversations.filter(c => c.unread).length;
    const archivedMessages = conversations.filter(c => c.archived).length;

    // ========== PERCENTILE CALCULATIONS ==========
    const clientPercentile = Math.min(100, Math.max(20, activeClients * 2));
    const recurringPercentile = Math.min(100, Math.max(20, recurringRate));
    const jobsPercentile = Math.min(100, Math.max(20, Math.round(completedJobs / 10)));
    const cancellationPercentile = Math.min(100, Math.max(20, 100 - cancellationRate * 5));

    const overallScore = Math.min(100, Math.round(
      (clientPercentile + recurringPercentile + jobsPercentile + cancellationPercentile) / 4
    ));

    return {
      // Customer
      newClientsThisMonth,
      activeClients,
      totalCustomers,
      recurringRate,
      recurringClients,
      
      // Jobs
      completedJobs,
      cancelledJobs,
      scheduledJobs,
      inProgressJobs,
      totalJobs,
      cancellationRate,
      onTimeRate,
      avgCompletionTime,
      
      // Schedule
      schedulesCreatedThisMonth,
      schedulesCompletedThisMonth,
      schedulesCancelledThisMonth,
      conversionRate,
      
      // Financial
      totalRevenue,
      revenuePerJob,
      tips,
      totalExpenses,
      fixedExpenses,
      variableExpenses,
      netProfit,
      profitMargin,
      
      // Team
      totalStaff,
      activeStaff,
      inactiveStaff,
      totalPayroll,
      pendingPayroll,
      avgJobsPerStaff,
      revenuePerStaff,
      payrollPerStaff,
      staffJobCounts,
      
      // Communications
      totalMessages,
      unreadMessages,
      archivedMessages,
      
      // Percentiles
      overallScore,
      clientPercentile,
      recurringPercentile,
      jobsPercentile,
      cancellationPercentile,
    };
  }, [customers, jobs, invoices, transactions, staff, payrollRecords, conversations]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare metrics for AI Consultant
  const aiMetrics = useMemo(() => ({
    totalCustomers: metrics.totalCustomers,
    activeCustomers: metrics.activeClients,
    newCustomersThisMonth: metrics.newClientsThisMonth,
    recurringRate: metrics.recurringRate,
    totalJobs: metrics.totalJobs,
    completedJobs: metrics.completedJobs,
    cancelledJobs: metrics.cancelledJobs,
    cancellationRate: metrics.cancellationRate,
    onTimeRate: metrics.onTimeRate,
    avgCompletionTime: metrics.avgCompletionTime,
    totalRevenue: metrics.totalRevenue,
    totalExpenses: metrics.totalExpenses,
    fixedExpenses: metrics.fixedExpenses,
    variableExpenses: metrics.variableExpenses,
    netProfit: metrics.netProfit,
    profitMargin: metrics.profitMargin,
    revenuePerJob: metrics.revenuePerJob,
    tips: metrics.tips,
    totalStaff: metrics.totalStaff,
    activeStaff: metrics.activeStaff,
    totalPayroll: metrics.totalPayroll,
    scheduledJobs: metrics.scheduledJobs,
    inProgressJobs: metrics.inProgressJobs,
    totalMessages: metrics.totalMessages,
    unreadMessages: metrics.unreadMessages,
  }), [metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const percentileRank = 100 - metrics.overallScore;

  return (
    <div className="space-y-8">
      {/* AI Consultant Card */}
      <AIConsultantCard metrics={aiMetrics} />

      {/* Overall Score Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <CardTitle className="text-xl">Overall Business Performance Score</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center bg-background">
                  <span className="text-4xl font-bold text-primary">{metrics.overallScore}</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Top {percentileRank}%
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">
                  Compared to similar service-based companies in your market.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Crescimento de customers
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Briefcase className="w-3 h-3 mr-1" />
                    Eficiência operacional
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="w-3 h-3 mr-1" />
                    Rentabilidade
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Receipt className="w-3 h-3 mr-1" />
                    Custos
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Reports Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatórios Financeiros</h2>
        </div>
        
        {/* Revenue */}
        <h3 className="text-md font-medium text-muted-foreground mb-3">Receita</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            icon={<DollarSign className="w-5 h-5 text-primary" />}
            title="Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            percentile={Math.min(100, Math.round(metrics.totalRevenue / 1000))}
            marketAverage="$50,000"
          />
          <MetricCard
            icon={<Receipt className="w-5 h-5 text-primary" />}
            title="Revenue per Job"
            value={formatCurrency(metrics.revenuePerJob)}
            percentile={Math.min(100, Math.round(metrics.revenuePerJob / 2))}
            marketAverage="$80"
          />
          <MetricCard
            icon={<Coins className="w-5 h-5 text-primary" />}
            title="Tips"
            value={formatCurrency(metrics.tips)}
            percentile={Math.min(100, Math.round(metrics.tips / 10))}
            insight={metrics.tips > 0 ? "Clientes satisfeitos!" : "Sem gorjetas registradas"}
          />
        </div>

        {/* Expenses */}
        <h3 className="text-md font-medium text-muted-foreground mb-3">Despesas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            icon={<Receipt className="w-5 h-5 text-primary" />}
            title="Total Expenses"
            value={formatCurrency(metrics.totalExpenses)}
            percentile={Math.min(100, Math.max(20, 100 - Math.round(metrics.totalExpenses / 1000)))}
          />
          <MetricCard
            icon={<Building className="w-5 h-5 text-primary" />}
            title="Fixed Expenses"
            value={formatCurrency(metrics.fixedExpenses)}
            percentile={Math.min(100, Math.max(30, 80))}
            insight="Aluguel, salários, seguros"
          />
          <MetricCard
            icon={<TrendingDown className="w-5 h-5 text-primary" />}
            title="Variable Expenses"
            value={formatCurrency(metrics.variableExpenses)}
            percentile={Math.min(100, Math.max(30, 70))}
            insight="Materiais, combustível, etc"
          />
        </div>

        {/* Profit */}
        <h3 className="text-md font-medium text-muted-foreground mb-3">Lucro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            title="Net Profit"
            value={formatCurrency(metrics.netProfit)}
            percentile={Math.min(100, Math.max(20, Math.round(metrics.netProfit / 500)))}
            status={metrics.netProfit > 0 ? "Positivo" : "Negativo"}
            statusType={metrics.netProfit > 0 ? "success" : "warning"}
          />
          <MetricCard
            icon={<Percent className="w-5 h-5 text-primary" />}
            title="Profit Margin"
            value={`${metrics.profitMargin}%`}
            percentile={Math.min(100, Number(metrics.profitMargin) * 3)}
            marketAverage="18%"
          />
        </div>
      </div>

      {/* Jobs Report (Operational) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatório de Jobs (Operacional)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            icon={<Briefcase className="w-5 h-5 text-primary" />}
            title="Jobs Completed"
            value={String(metrics.completedJobs)}
            percentile={metrics.jobsPercentile}
            marketAverage="100"
          />
          <MetricCard
            icon={<XCircle className="w-5 h-5 text-primary" />}
            title="Cancellations"
            value={String(metrics.cancelledJobs)}
            percentile={metrics.cancellationPercentile}
            insight={`${metrics.cancellationRate}% taxa de cancelamento`}
          />
          <MetricCard
            icon={<Timer className="w-5 h-5 text-primary" />}
            title="Completion Time (Avg)"
            value={`${metrics.avgCompletionTime} min`}
            percentile={Math.min(100, Math.max(30, 100 - metrics.avgCompletionTime))}
            marketAverage="90 min"
          />
          <MetricCard
            icon={<CheckCircle className="w-5 h-5 text-primary" />}
            title="On-Time Completion"
            value={`${metrics.onTimeRate}%`}
            percentile={Math.min(100, metrics.onTimeRate)}
            status={metrics.onTimeRate > 90 ? "Excelente" : undefined}
            statusType="success"
          />
          <KPICard
            icon={<Clock className="w-6 h-6" />}
            title="Scheduled Jobs"
            value={String(metrics.scheduledJobs)}
            iconClassName="bg-warning/15 text-warning-foreground"
          />
          <KPICard
            icon={<RefreshCw className="w-6 h-6" />}
            title="In Progress"
            value={String(metrics.inProgressJobs)}
            iconClassName="bg-primary/15 text-primary"
          />
        </div>
      </div>

      {/* Schedule Report */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatório de Agendamentos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<Calendar className="w-6 h-6" />}
            title="Agendamentos Criados"
            value={String(metrics.schedulesCreatedThisMonth)}
            iconClassName="bg-primary/15 text-primary"
          />
          <KPICard
            icon={<CalendarCheck className="w-6 h-6" />}
            title="Agendamentos Concluídos"
            value={String(metrics.schedulesCompletedThisMonth)}
            iconClassName="bg-success/15 text-success"
          />
          <KPICard
            icon={<CalendarX className="w-6 h-6" />}
            title="Agendamentos Cancelados"
            value={String(metrics.schedulesCancelledThisMonth)}
            iconClassName="bg-destructive/15 text-destructive"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            title="Taxa de Conversão"
            value={`${metrics.conversionRate}%`}
            percentile={metrics.conversionRate}
            insight="Agendado → Concluído"
          />
        </div>
      </div>

      {/* Customer Report */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatório de Clientes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={<UserPlus className="w-5 h-5 text-primary" />}
            title="New Customers"
            value={String(metrics.newClientsThisMonth)}
            percentile={Math.min(100, metrics.newClientsThisMonth * 10)}
            marketAverage="5"
            insight="Este mês"
          />
          <MetricCard
            icon={<Users className="w-5 h-5 text-primary" />}
            title="Total Customers"
            value={String(metrics.totalCustomers)}
            percentile={metrics.clientPercentile}
            marketAverage="50"
          />
          <MetricCard
            icon={<RefreshCw className="w-5 h-5 text-primary" />}
            title="Recurring Customers"
            value={`${metrics.recurringRate}%`}
            percentile={metrics.recurringPercentile}
            marketAverage="45%"
            insight={metrics.recurringRate > 50 ? "Boa retenção!" : undefined}
          />
        </div>
      </div>

      {/* Team Report (Payroll & Performance) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatório de Equipe (Payroll & Performance)</h2>
        </div>
        
        <h3 className="text-md font-medium text-muted-foreground mb-3">Equipe</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <KPICard
            icon={<Users className="w-6 h-6" />}
            title="Total de Funcionários"
            value={String(metrics.totalStaff)}
            iconClassName="bg-primary/15 text-primary"
          />
          <KPICard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Funcionários Ativos"
            value={String(metrics.activeStaff)}
            iconClassName="bg-success/15 text-success"
          />
          <KPICard
            icon={<XCircle className="w-6 h-6" />}
            title="Funcionários Inativos"
            value={String(metrics.inactiveStaff)}
            iconClassName="bg-destructive/15 text-destructive"
          />
        </div>

        <h3 className="text-md font-medium text-muted-foreground mb-3"><T k="reports.payroll" /></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<Wallet className="w-5 h-5 text-primary" />}
            title="Payroll (Total Pago)"
            value={formatCurrency(metrics.totalPayroll)}
            percentile={Math.min(100, Math.max(30, 70))}
          />
          <KPICard
            icon={<Clock className="w-6 h-6" />}
            title="Payroll Pendente"
            value={formatCurrency(metrics.pendingPayroll)}
            iconClassName="bg-warning/15 text-warning-foreground"
          />
          <MetricCard
            icon={<CreditCard className="w-5 h-5 text-primary" />}
            title="Payroll por Funcionário"
            value={formatCurrency(metrics.payrollPerStaff)}
            percentile={Math.min(100, Math.max(30, 60))}
            marketAverage="$2,000"
          />
          <MetricCard
            icon={<Briefcase className="w-5 h-5 text-primary" />}
            title="Jobs por Funcionário"
            value={String(metrics.avgJobsPerStaff)}
            percentile={Math.min(100, metrics.avgJobsPerStaff * 5)}
            marketAverage="20"
          />
        </div>

        <h3 className="text-md font-medium text-muted-foreground mb-3">Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            icon={<DollarSign className="w-5 h-5 text-primary" />}
            title="Revenue por Funcionário"
            value={formatCurrency(metrics.revenuePerStaff)}
            percentile={Math.min(100, Math.round(metrics.revenuePerStaff / 100))}
            marketAverage="$5,000"
          />
          <MetricCard
            icon={<PiggyBank className="w-5 h-5 text-primary" />}
            title="Custo vs Receita"
            value={`${metrics.activeStaff > 0 && metrics.revenuePerStaff > 0 
              ? Math.round((metrics.payrollPerStaff / metrics.revenuePerStaff) * 100) 
              : 0}%`}
            percentile={Math.min(100, Math.max(30, 100 - (metrics.payrollPerStaff / Math.max(1, metrics.revenuePerStaff)) * 100))}
            insight="Payroll como % da receita"
          />
        </div>
      </div>

      {/* Communications Report */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Relatório de Comunicações</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Total de Conversas"
            value={String(metrics.totalMessages)}
            iconClassName="bg-primary/15 text-primary"
          />
          <KPICard
            icon={<Bell className="w-6 h-6" />}
            title="Mensagens Não Lidas"
            value={String(metrics.unreadMessages)}
            iconClassName="bg-warning/15 text-warning-foreground"
          />
          <KPICard
            icon={<Mail className="w-6 h-6" />}
            title="Conversas Arquivadas"
            value={String(metrics.archivedMessages)}
            iconClassName="bg-muted text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
