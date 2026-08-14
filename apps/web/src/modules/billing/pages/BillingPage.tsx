import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  RefreshCw,
  Eye,
  Mail,
  DollarSign,
  MoreHorizontal,
  Zap,
  XCircle,
  CloudOff,
  Trash2,
  Pencil,
} from "lucide-react";
import { CreateInvoiceModal } from "@/components/billing/CreateInvoiceModal";
import { EditInvoiceModal } from "@/components/billing/EditInvoiceModal";
import { AppointmentModal } from "@/components/schedule/AppointmentModal";
import { 
  useInvoices, 
  Invoice, 
  useSyncInvoicesWithQB, 
  useMarkInvoicePaid,
  useSendInvoiceReminder,
  useInvoiceStats,
  useDeleteInvoice
} from "@/hooks/useInvoices";
import { useCreateJob } from "@/hooks/useJobs";
import { useQuickBooks } from "@/hooks/useQuickBooks";
import { useQuickBooksSync } from "@/hooks/useQuickBooksSync";
import { formatDateDisplay } from "@/lib/utils";
import { useLanguage } from "@/contexts/useLanguage";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCustomers } from "@/hooks/useCustomers";
import { supabase } from "@/integrations/supabase/client";

interface LeadDataForJob {
  customerId: string;
  customerName: string;
  address: string;
  serviceType: string;
  amount: number;
  leadId: string;
}

export function Billing() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [editInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"view" | "edit">("edit");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);
  
  // Job creation modal state (opens after deposit invoice is marked as paid)
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [leadDataForJob, setLeadDataForJob] = useState<LeadDataForJob | null>(null);

  const { data: invoices = [], isLoading } = useInvoices();
  const { data: stats } = useInvoiceStats();
  const { data: customers = [] } = useCustomers();
  const { data: companySettings } = useCompanySettings();
  const { isConnected: qbConnected } = useQuickBooks();
  const { syncInvoiceToQuickBooks } = useQuickBooksSync();
  const syncInvoices = useSyncInvoicesWithQB();
  const markPaid = useMarkInvoicePaid();
  const sendReminder = useSendInvoiceReminder();
  const deleteInvoice = useDeleteInvoice();
  const createJob = useCreateJob();

  // Handle re-sync for a specific invoice
  const handleResyncInvoice = async (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!qbConnected) {
      toast.error("QuickBooks não conectado");
      return;
    }
    
    setSyncingInvoiceId(invoice.id);
    const result = await syncInvoiceToQuickBooks(
      invoice.id,
      invoice.customer_id,
      invoice.customer?.name || "Unknown",
      invoice.customer?.email || null,
      null,
      invoice.total || 0,
      invoice.invoice_number,
      invoice.notes || undefined
    );
    setSyncingInvoiceId(null);
    
    if (result.success) {
      toast.success("Invoice sincronizado com sucesso!");
    }
  };

  // Filter invoices by status
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const customerName = inv.customer?.name || '';
        if (searchField === "all") {
          return (
            inv.invoice_number.toLowerCase().includes(search) ||
            customerName.toLowerCase().includes(search) ||
            (inv.job_id || '').toLowerCase().includes(search)
          );
        }
        if (searchField === "invoice") return inv.invoice_number.toLowerCase().includes(search);
        if (searchField === "customer") return customerName.toLowerCase().includes(search);
        if (searchField === "jobId") return (inv.job_id || '').toLowerCase().includes(search);
      }
      return true;
    });
  }, [invoices, statusFilter, searchTerm, searchField]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleEditInvoice = (invoice: Invoice, mode: "view" | "edit" = "edit") => {
    setSelectedInvoice(invoice);
    setInvoiceModalMode(mode);
    setEditInvoiceOpen(true);
  };

  const handleSyncWithQB = async () => {
    if (!qbConnected) {
      toast.error("Conecte ao QuickBooks primeiro");
      return;
    }
    await syncInvoices.mutateAsync();
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    // Get customer phone for SMS notification
    const customer = customers.find(c => c.id === invoice.customer_id);
    const customerPhone = customer?.phone || customer?.phone2 || undefined;

    await markPaid.mutateAsync({
      invoiceId: invoice.id,
      qbInvoiceId: invoice.qb_invoice_id,
      amount: invoice.total || 0,
      customerId: invoice.customer_id,
      customerName: invoice.customer?.name,
      customerPhone: customerPhone,
      invoiceNumber: invoice.invoice_number,
      companyName: companySettings?.trade_name || companySettings?.legal_name,
    });

    // If this is a deposit invoice linked to a lead, auto-open job creation
    const invoiceType = invoice.invoice_type;
    const leadId = invoice.lead_id;

    const notesLower = (invoice.notes || "").toLowerCase();
    const isDepositInvoice = invoiceType === "deposit" ||
      notesLower.includes("depósito") ||
      notesLower.includes("deposit") ||
      notesLower.includes("50%");

    if (!isDepositInvoice || !leadId) return;

    // Do NOT rely on leads.has_job (it can be stale/incorrect). Check actual jobs table.
    const { data: existingJob, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("lead_id", leadId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      // If there is any DB error here, don't block the user silently
      console.error("Error checking existing job for lead:", jobError);
    }

    if (existingJob?.id) {
      toast.info("Este lead já possui um job criado.");
      return;
    }

    try {
      // Fetch lead data to pre-fill job modal (avoid embedded customers because leads has multiple customer FKs)
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("id, title, address, service_type, total, customer_id")
        .eq("id", leadId)
        .single();

      if (leadError) throw leadError;
      if (!leadData) return;

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, name")
        .eq("id", leadData.customer_id)
        .maybeSingle();

      if (customerError) throw customerError;

      setLeadDataForJob({
        customerId: leadData.customer_id,
        customerName: customerData?.name || invoice.customer?.name || "",
        address: leadData.address || "",
        serviceType: leadData.service_type || leadData.title || "",
        // Job amount should be the full contract value from the lead
        amount: leadData.total || (invoice.total || 0) * 2,
        leadId: leadData.id,
      });

      setCreateJobModalOpen(true);
      toast.info("Depósito confirmado! Crie o job agora.");
    } catch (err) {
      console.error("Error preparing job creation after deposit paid:", err);
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Não foi possível abrir o modal de create job: ${message}`);
    }
  };

  const handleSendReminder = async (invoice: Invoice, type: "upcoming" | "overdue") => {
    // Get customer phone for SMS notification
    const customer = customers.find(c => c.id === invoice.customer_id);
    const customerPhone = customer?.phone || customer?.phone2 || undefined;

    await sendReminder.mutateAsync({ 
      invoiceId: invoice.id, 
      type,
      customerPhone,
      customerName: invoice.customer?.name,
      customerId: invoice.customer_id,
      invoiceNumber: invoice.invoice_number,
      invoiceAmount: invoice.total || 0,
      dueDate: invoice.due_date || undefined,
      companyName: companySettings?.trade_name || companySettings?.legal_name,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "sent": return "secondary";
      case "viewed": return "outline";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="w-3 h-3" />;
      case "sent": return <Send className="w-3 h-3" />;
      case "viewed": return <Eye className="w-3 h-3" />;
      case "overdue": return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <PageLayout
      headerActions={
        <>
          {qbConnected && (
            <Button variant="outline" size="sm" onClick={handleSyncWithQB} disabled={syncInvoices.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncInvoices.isPending ? "animate-spin" : ""}`} />
              Sync QuickBooks
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateInvoiceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span>{t("billing.createInvoice")}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">

          {/* Modals */}
          <CreateInvoiceModal open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen} />
          <EditInvoiceModal 
            open={editInvoiceOpen} 
            onOpenChange={setEditInvoiceOpen} 
            invoice={selectedInvoice}
            mode={invoiceModalMode}
          />

          {/* Stats Cards - Using QuickBooks synced data */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="cursor-pointer hover:border-warning/50 transition-colors" onClick={() => setStatusFilter("sent")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("billing.invoiceSent")}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.sent || 0}</p>
                    <p className="text-sm text-warning">{formatCurrency(stats?.sentTotal || 0)} {t("billing.awaitingPayment")}</p>
                  </div>
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <Send className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter("viewed")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("billing.openedInvoices")}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.viewed || 0}</p>
                    <p className="text-sm text-primary">{formatCurrency(stats?.viewedTotal || 0)} viewed</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-success/50 transition-colors" onClick={() => setStatusFilter("paid")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("billing.paidInvoices")}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.paid || 0}</p>
                    <p className="text-sm text-success">{formatCurrency(stats?.paidTotal || 0)} {t("billing.collectionRate")}</p>
                  </div>
                  <div className="p-3 bg-success/10 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-destructive/50 transition-colors" onClick={() => setStatusFilter("overdue")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("billing.overdueInvoices")}</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.overdue || 0}</p>
                    <p className="text-sm text-destructive">{formatCurrency(stats?.overdueTotal || 0)} {t("billing.pastDue")}</p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("billing.recentInvoices")}</CardTitle>
              {statusFilter !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
                  Clear Filter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={searchField === "all" ? t("billing.searchPlaceholder") : searchField === "invoice" ? t("billing.searchByInvoice") : searchField === "customer" ? t("billing.searchByCustomer") : t("billing.searchByJobId")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={searchField} onValueChange={setSearchField}>
                  <SelectTrigger className="w-full lg:w-[160px]">
                    <SelectValue placeholder="Search by" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="invoice">{t("billing.invoiceId")}</SelectItem>
                    <SelectItem value="customer">{t("billing.customer")}</SelectItem>
                    <SelectItem value="jobId">{t("billing.jobId")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("billing.invoiceId")}</TableHead>
                    <TableHead>{t("billing.jobId")}</TableHead>
                    <TableHead>{t("billing.customer")}</TableHead>
                    <TableHead>{t("billing.amount")}</TableHead>
                    <TableHead>{t("billing.issueDate")}</TableHead>
                    <TableHead>{t("billing.dueDate")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>QB Sync</TableHead>
                    <TableHead>{t("billing.autoGen")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {t("billing.noInvoicesFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow 
                        key={invoice.id} 
                        className="cursor-pointer"
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell className="font-mono text-sm">{invoice.job_id ? invoice.job_id.slice(0, 8) : '-'}</TableCell>
                        <TableCell className="font-medium">{invoice.customer?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(invoice.total || 0)}</TableCell>
                        <TableCell>{invoice.issue_date ? formatDateDisplay(invoice.issue_date) : '-'}</TableCell>
                        <TableCell>{invoice.due_date ? formatDateDisplay(invoice.due_date) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(invoice.status)} className="gap-1">
                            {getStatusIcon(invoice.status)}
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  {invoice.qb_synced_at ? (
                                    <CheckCircle className="w-4 h-4 text-success" />
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <CloudOff className="w-4 h-4 text-muted-foreground" />
                                      {qbConnected && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(e) => handleResyncInvoice(invoice, e)}
                                          disabled={syncingInvoiceId === invoice.id}
                                        >
                                          {syncingInvoiceId === invoice.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <RefreshCw className="w-3 h-3" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {invoice.qb_synced_at 
                                  ? `Sincronizado em ${formatDateDisplay(invoice.qb_synced_at.split('T')[0])}`
                                  : "Não sincronizado com QuickBooks"
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {invoice.auto_generated ? (
                            <Badge variant="outline" className="gap-1">
                              <Zap className="w-3 h-3" />
                              Auto
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Manual</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Invoice actions">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {invoice.status !== "paid" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleMarkPaid(invoice)}>
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Marcar como Pago
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendReminder(invoice, invoice.status === "overdue" ? "overdue" : "upcoming")}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Enviar Lembrete
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleEditInvoice(invoice, "edit")}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditInvoice(invoice, "view")}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteInvoice.mutate(invoice.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>

      {/* Job Creation Modal - opens after deposit invoice is marked as paid */}
      {createJobModalOpen && leadDataForJob && (
        <AppointmentModal
          open={createJobModalOpen}
          onOpenChange={(open) => {
            setCreateJobModalOpen(open);
            if (!open) setLeadDataForJob(null);
          }}
          mode="create"
          prefilledData={{
            customer: leadDataForJob.customerName,
            address: leadDataForJob.address,
            service: leadDataForJob.serviceType,
            serviceType: leadDataForJob.serviceType,
            amount: String(leadDataForJob.amount),
            estimateId: leadDataForJob.leadId,
          }}
          onJobCreated={(payload) => {
            // Use the customerId from leadDataForJob directly since we already have it
            const customerId = leadDataForJob.customerId;
            
            if (!customerId) {
              toast.error("Customer not found. Please try again.");
              return;
            }

            // Parse duration to minutes if provided
            const parseDurationToMinutes = (value: string): number | null => {
              if (!value || value.trim() === "") return null;
              const normalized = value.toLowerCase().replace(/\s+/g, "");
              const hourMinMatch = normalized.match(/(\d+)\s*h(?:ours?|r)?[:\s]*(\d+)?/i);
              if (hourMinMatch) {
                const hours = parseInt(hourMinMatch[1], 10);
                const mins = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
                return hours * 60 + mins;
              }
              const minOnlyMatch = normalized.match(/(\d+)\s*(?:min(?:utes?)?|m)$/i);
              if (minOnlyMatch) return parseInt(minOnlyMatch[1], 10);
              const colonMatch = normalized.match(/(\d+):(\d+)/);
              if (colonMatch) {
                return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
              }
              const justNumber = parseInt(normalized, 10);
              if (!isNaN(justNumber)) return justNumber;
              return null;
            };

            createJob.mutate({
              customer_id: customerId,
              title: payload.serviceType || "Job",
              service_type: payload.serviceType || undefined,
              scheduled_date: payload.date || undefined,
              scheduled_time: payload.time || undefined,
              staff_assigned: payload.staffMembers,
              status: payload.status || "scheduled",
              duration_text: payload.duration || undefined,
              duration_minutes: parseDurationToMinutes(payload.duration || "") ?? undefined,
              amount: payload.amount,
              address: payload.address || undefined,
              notes: payload.notes || undefined,
              additional_notes: payload.additionalNotes || undefined,
              lead_id: leadDataForJob.leadId, // Link job to the lead
              generateRecurring: payload.generateRecurring ?? true,
            });
          }}
        />
      )}
    </PageLayout>
  );
}
