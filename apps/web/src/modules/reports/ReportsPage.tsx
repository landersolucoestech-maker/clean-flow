import { useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { AnalyticsTab } from "@/components/reports/AnalyticsTab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileSpreadsheet,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Receipt,
  UserPlus,
  Wallet,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useInvoices } from "@/hooks/useInvoices";
import { useLeads } from "@/hooks/useLeads";
import { useTransactions } from "@/hooks/useTransactions";
import { usePayrollRecords } from "@/hooks/usePayrollRecords";
import { useStaff } from "@/hooks/useStaff";
import { useLanguage } from "@/contexts/useLanguage";

interface ReportData {
  id: string;
  name: string;
  description: string;
  type: string;
  records: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export function Reports() {
  const { t } = useLanguage();
  // Fetch real data from database
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: jobs = [], isLoading: isLoadingJobs } = useJobs();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices();
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useTransactions();
  const { data: payrollRecords = [], isLoading: isLoadingPayroll } = usePayrollRecords();
  const { data: staff = [], isLoading: isLoadingStaff } = useStaff();

  const isLoading = isLoadingCustomers || isLoadingJobs || isLoadingInvoices || 
                    isLoadingLeads || isLoadingTransactions || isLoadingPayroll || isLoadingStaff;

  const handleExportReport = async (report: ReportData) => {
    let data: Record<string, unknown>[] = [];
    let fileName = "";

    switch (report.id) {
      case "schedule":
        data = jobs.map((j) => ({
          "ID": j.id,
          "Título": j.title,
          "Cliente": j.customer?.name || 'N/A',
          "Data": j.scheduled_date || 'N/A',
          "Hora": j.scheduled_time || 'N/A',
          "Endereço": j.address || 'N/A',
          "Status": j.status,
          "Tipo de Serviço": j.service_type || 'N/A',
          "Valor": j.amount || 0,
        }));
        fileName = "agendamentos";
        break;

      case "customers":
        data = customers.map((c) => ({
          "ID": c.id,
          "Nome": c.name,
          "Email": c.email || 'N/A',
          "Telefone": c.phone || 'N/A',
          "Telefone 2": c.phone2 || 'N/A',
          "Endereço": c.address || 'N/A',
          "Cidade": c.city || 'N/A',
          "Estado": c.state || 'N/A',
          "CEP": c.zip_code || 'N/A',
          "Status": c.status || 'Active',
          "Total Jobs": c.total_jobs || 0,
          "Receita": c.revenue || 0,
          "Avaliação": c.rating || 5,
          "Frequência": c.frequency || 'weekly',
          "Cliente Desde": c.customer_since || 'N/A',
        }));
        fileName = "clientes";
        break;

      case "transactions":
        data = transactions.map((t) => ({
          "ID": t.id,
          "Nome": t.name,
          "Data": t.date,
          "Categoria": t.category,
          "Status": t.status,
          "Valor": t.amount,
          "Tipo": t.type,
          "Descrição": t.description || 'N/A',
        }));
        fileName = "transacoes";
        break;

      case "invoices":
        data = invoices.map((inv) => ({
          "Número": inv.invoice_number,
          "Cliente": inv.customer?.name || 'N/A',
          "Subtotal": inv.subtotal || 0,
          "Taxa": inv.tax_amount || 0,
          "Total": inv.total || 0,
          "Pago": inv.amount_paid || 0,
          "Data Emissão": inv.issue_date || 'N/A',
          "Vencimento": inv.due_date || 'N/A',
          "Status": inv.status,
        }));
        fileName = "faturas";
        break;

      case "leads":
        data = leads.map((e) => ({
          "Número": e.estimate_number,
          "Título": e.title,
          "Cliente": e.customer?.name || 'N/A',
          "Email": e.email || 'N/A',
          "Telefone": e.phone || 'N/A',
          "Valor": e.total || 0,
          "Válido até": e.valid_until || 'N/A',
          "Status": e.status,
          "Origem": e.origin || 'N/A',
        }));
        fileName = "leads";
        break;

      case "payroll":
        data = payrollRecords.map((p) => ({
          "ID": p.id,
          "Funcionário": p.employee_name,
          "Período Início": p.period_start,
          "Período Fim": p.period_end,
          "Cliente": p.client || 'N/A',
          "Tipo": p.cleaning_type || 'N/A',
          "Valor Base": p.base_value,
          "Bônus": p.bonus,
          "Total": p.total,
          "Status": p.status,
          "Tipo Pagamento": p.payment_type,
        }));
        fileName = "folha_pagamento";
        break;

      case "team":
        data = staff.map((s) => ({
          "ID": s.id,
          "Nome": s.name,
          "Email": s.email || 'N/A',
          "Telefone": s.phone || 'N/A',
          "Motorista": s.is_driver ? 'Sim' : 'Não',
          "Ativo": s.is_active ? 'Sim' : 'Não',
          "Criado em": s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A',
        }));
        fileName = "equipe";
        break;

      default:
      toast.error(t("reports.reportNotFound"));
        return;
    }

    const XLSX = await import("xlsx-js-style");

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.name.substring(0, 31));

    // Generate file and download
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `${fileName}_${dateStr}.xlsx`);
    
    toast.success(`${report.name} ${t("reports.exportedSuccessfully")}`);
  };

  // Calculate real data from database
  const reportsData = useMemo(() => {
    const totalReceita = transactions
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalDespesas = Math.abs(
      transactions
        .filter(t => t.type === "despesa")
        .reduce((sum, t) => sum + Number(t.amount), 0)
    );

    const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length;
    const inProgressJobs = jobs.filter(j => j.status === 'in-progress').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;

    const activeCustomers = customers.filter(c => c.status === 'Active').length;
    const inactiveCustomers = customers.filter(c => c.status === 'Inactive').length;

    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'pending').length;
    const overdueInvoices = invoices.filter(i => {
      if (i.status === 'paid') return false;
      if (!i.due_date) return false;
      return new Date(i.due_date) < new Date();
    }).length;

    const approvedLeads = leads.filter(e => e.status === 'approved').length;
    const pendingLeads = leads.filter(e => e.status === 'pending' || e.status === 'sent').length;
    const expiredLeads = leads.filter(e => e.status === 'expired').length;

    const paidPayroll = payrollRecords.filter(p => p.status === 'Paid').length;
    const pendingPayroll = payrollRecords.filter(p => p.status === 'Pending').length;
    const payrollTotal = payrollRecords.reduce((sum, p) => sum + Number(p.total), 0);

    const activeStaff = staff.filter(s => s.is_active).length;
    const inactiveStaff = staff.filter(s => !s.is_active).length;

    return [
      {
        id: "schedule",
        name: t("reports.schedule"),
        description: `${scheduledJobs} ${t("reports.scheduled")}, ${inProgressJobs} ${t("reports.inProgress")}, ${completedJobs} ${t("reports.completed")}`,
        type: "Agenda",
        records: jobs.length,
        icon: Calendar,
        iconColor: "text-orange-500",
        iconBg: "bg-orange-500/10",
      },
      {
        id: "customers",
        name: t("reports.customers"),
        description: `${activeCustomers} ${t("reports.active")}, ${inactiveCustomers} ${t("reports.inactive")}`,
        type: "Clientes",
        records: customers.length,
        icon: Users,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-500/10",
      },
      {
        id: "transactions",
        name: t("reports.transactions"),
        description: `${t("reports.revenue")}: $${totalReceita.toFixed(2)} | ${t("reports.expenses")}: $${totalDespesas.toFixed(2)}`,
        type: "Financeiro",
        records: transactions.length,
        icon: Wallet,
        iconColor: "text-green-500",
        iconBg: "bg-green-500/10",
      },
      {
        id: "invoices",
        name: t("reports.invoices"),
        description: `${paidInvoices} ${t("reports.paid")}, ${pendingInvoices} ${t("reports.pending")}, ${overdueInvoices} ${t("reports.overdue")}`,
        type: "Faturamento",
        records: invoices.length,
        icon: Receipt,
        iconColor: "text-purple-500",
        iconBg: "bg-purple-500/10",
      },
      {
        id: "leads",
        name: t("reports.leads"),
        description: `${approvedLeads} ${t("reports.approved")}, ${pendingLeads} ${t("reports.pending")}, ${expiredLeads} ${t("reports.expired")}`,
        type: "Vendas",
        records: leads.length,
        icon: FileText,
        iconColor: "text-cyan-500",
        iconBg: "bg-cyan-500/10",
      },
      {
        id: "payroll",
        name: t("reports.payroll"),
        description: `${paidPayroll} ${t("reports.paid")}, ${pendingPayroll} ${t("reports.pending")} | ${t("reports.total")}: $${payrollTotal.toFixed(2)}`,
        type: "Payroll",
        records: payrollRecords.length,
        icon: DollarSign,
        iconColor: "text-yellow-500",
        iconBg: "bg-yellow-500/10",
      },
      {
        id: "team",
        name: t("reports.teamMembers"),
        description: `${activeStaff} ${t("reports.active")}, ${inactiveStaff} ${t("reports.inactive")}`,
        type: "Equipe",
        records: staff.length,
        icon: UserPlus,
        iconColor: "text-indigo-500",
        iconBg: "bg-indigo-500/10",
      },
    ];
  }, [jobs, customers, invoices, leads, transactions, payrollRecords, staff, t]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 pl-[10px] pb-0 pr-[10px] pt-px mx-[8px] py-0 my-[4px]">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("reports.title")}</h1>
              <p className="text-muted-foreground">
                {t("reports.subtitle")}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  )}
                  {t("reports.exportExcel")}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background">
                {reportsData
                  .filter((report) => report.records > 0)
                  .map((report) => (
                    <DropdownMenuItem
                      key={report.id}
                      onClick={() => handleExportReport(report)}
                      className="cursor-pointer"
                    >
                      <report.icon className={`w-4 h-4 mr-2 ${report.iconColor}`} />
                      {report.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Analytics Content */}
          <AnalyticsTab />

        </main>
      </div>
    </div>
  );
}
