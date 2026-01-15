import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useStaff } from "@/hooks/useStaff";
import { useLeads } from "@/hooks/useLeads";
import { useInvoices } from "@/hooks/useInvoices";
import { useTransactions } from "@/hooks/useTransactions";
import { usePayrollRecords } from "@/hooks/usePayrollRecords";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { JobDetailsModal } from "@/components/jobs/JobDetailsModal";
import { EditInvoiceModal } from "@/components/billing/EditInvoiceModal";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { toast } from "sonner";
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Percent,
  Users,
  Briefcase,
  UserCheck,
  FileText,
  Receipt,
  Wallet,
  Edit,
  ChevronRight,
  Target,
  DollarSign,
  Building2,
  User,
  CreditCard,
  Plug,
  FileCode,
} from "lucide-react";

type AuditCategory = 
  | "customers" 
  | "jobs" 
  | "staff" 
  | "estimates" 
  | "invoices" 
  | "transactions"
  | "leads"
  | "payroll"
  | "profile"
  | "company"
  | "billing"
  | "team"
  | "integrations"
  | "templates";

interface MissingField {
  key: string;
  label: string;
}

interface AuditRecord {
  id: string;
  name: string;
  category: AuditCategory;
  missingFields: MissingField[];
  isComplete: boolean;
}

// Define required fields for each category
const REQUIRED_FIELDS: Record<AuditCategory, { key: string; label: string }[]> = {
  customers: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "frequency", label: "Frequency" },
    { key: "payment_method", label: "Payment Method" },
  ],
  jobs: [
    { key: "address", label: "Address" },
    { key: "scheduled_date", label: "Scheduled Date" },
    { key: "scheduled_time", label: "Scheduled Time" },
    { key: "amount", label: "Amount" },
    { key: "duration_minutes", label: "Duration" },
    { key: "staff_assigned", label: "Staff Assigned" },
    { key: "service_type", label: "Service Type" },
  ],
  staff: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "team", label: "Team" },
    { key: "payment_method", label: "Payment Method" },
  ],
  estimates: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "total", label: "Total" },
    { key: "valid_until", label: "Valid Until" },
  ],
  invoices: [
    { key: "due_date", label: "Due Date" },
    { key: "total", label: "Total" },
    { key: "notes", label: "Notes" },
  ],
  transactions: [
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },
    { key: "service_type", label: "Service Type" },
  ],
  leads: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "total", label: "Total" },
  ],
  payroll: [
    { key: "staff_id", label: "Staff ID" },
    { key: "client", label: "Client" },
    { key: "cleaning_type", label: "Cleaning Type" },
  ],
  profile: [],
  company: [
    { key: "legal_name", label: "Legal Name" },
    { key: "trade_name", label: "Trade Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "tax_id", label: "Tax ID" },
    { key: "currency", label: "Currency" },
    { key: "timezone", label: "Timezone" },
    { key: "logo_url", label: "Logo" },
  ],
  billing: [],
  team: [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "team", label: "Team" },
    { key: "payment_method", label: "Payment Method" },
  ],
  integrations: [],
  templates: [],
};

export function AuditTab() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory>("customers");
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  
  // Modal states
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Fetch data from all tables
  const { data: customers = [] } = useCustomers();
  const { data: jobs = [] } = useJobs();
  const { data: staff = [] } = useStaff();
  const { data: leads = [] } = useLeads();
  const { data: invoices = [] } = useInvoices();
  const { data: transactions = [] } = useTransactions();
  const { data: payrollRecords = [] } = usePayrollRecords();
  const { data: companySettings } = useCompanySettings();

  // Helper function to check if a field is missing
  const isFieldMissing = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === "number" && value === 0) return true;
    return false;
  };

  // Process records for each category
  const processRecords = <T extends { id: string }>(
    data: T[],
    category: AuditCategory,
    nameField: keyof T
  ): AuditRecord[] => {
    return data.map((record) => {
      const missingFields: MissingField[] = [];
      const requiredFields = REQUIRED_FIELDS[category];
      const recordAsAny = record as Record<string, unknown>;

      requiredFields.forEach((field) => {
        // Special handling for customers: check addresses for city/state/zip
        if (category === "customers" && (field.key === "city" || field.key === "state" || field.key === "zip_code")) {
          const addresses = recordAsAny["addresses"] as Array<Record<string, unknown>> | undefined;
          const addressKey = field.key === "zip_code" ? "postal_code" : field.key;
          
          // Check if any address has this field filled
          const hasValueInAddresses = addresses?.some((addr) => !isFieldMissing(addr[addressKey]));
          // Also check the direct field on customer
          const hasValueDirect = !isFieldMissing(recordAsAny[field.key]);
          
          if (!hasValueInAddresses && !hasValueDirect) {
            missingFields.push(field);
          }
        } else {
          if (isFieldMissing(recordAsAny[field.key])) {
            missingFields.push(field);
          }
        }
      });

      const nameValue = record[nameField];
      const displayName = typeof nameValue === "string" ? nameValue : `${category} ${record.id}`;

      return {
        id: record.id,
        name: displayName || `${category} ${record.id}`,
        category,
        missingFields,
        isComplete: missingFields.length === 0,
      };
    });
  };

  // Process company settings as a single record
  const processCompanySettings = (): AuditRecord[] => {
    if (!companySettings) {
      return [{
        id: "company-settings",
        name: "Company Settings",
        category: "company",
        missingFields: REQUIRED_FIELDS.company,
        isComplete: false,
      }];
    }

    const missingFields: MissingField[] = [];
    const requiredFields = REQUIRED_FIELDS.company;
    const recordAsAny = companySettings as unknown as Record<string, unknown>;

    requiredFields.forEach((field) => {
      if (isFieldMissing(recordAsAny[field.key])) {
        missingFields.push(field);
      }
    });

    return [{
      id: companySettings.id || "company-settings",
      name: companySettings.trade_name || companySettings.legal_name || "Company Settings",
      category: "company",
      missingFields,
      isComplete: missingFields.length === 0,
    }];
  };

  // Get audit data for each category
  const auditData = useMemo(() => {
    const customersAudit = processRecords(customers, "customers", "name");
    const jobsAudit = processRecords(jobs, "jobs", "title");
    const staffAudit = processRecords(staff, "staff", "name");
    const leadsAudit = processRecords(leads, "leads", "id");
    const invoicesAudit = processRecords(invoices, "invoices", "invoice_number");
    const transactionsAudit = processRecords(transactions, "transactions", "name");
    const payrollAudit = processRecords(payrollRecords, "payroll", "employee_name");
    const companyAudit = processCompanySettings();
    const teamAudit = processRecords(staff, "team", "name");

    return {
      customers: customersAudit,
      jobs: jobsAudit,
      staff: staffAudit,
      leads: leadsAudit,
      invoices: invoicesAudit,
      transactions: transactionsAudit,
      payroll: payrollAudit,
      profile: [],
      company: companyAudit,
      billing: [],
      team: teamAudit,
      integrations: [],
      templates: [],
    };
  }, [customers, jobs, staff, leads, invoices, transactions, payrollRecords, companySettings]);

  // Calculate statistics
  const stats = useMemo(() => {
    const allRecords = Object.values(auditData).flat();
    const totalRecords = allRecords.length;
    const completeRecords = allRecords.filter((r) => r.isComplete).length;
    const incompleteRecords = totalRecords - completeRecords;
    const completionRate = totalRecords > 0 ? Math.round((completeRecords / totalRecords) * 100) : 0;

    return {
      totalRecords,
      completeRecords,
      incompleteRecords,
      completionRate,
    };
  }, [auditData]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      customers: auditData.customers.filter((r) => !r.isComplete).length,
      jobs: auditData.jobs.filter((r) => !r.isComplete).length,
      staff: auditData.staff.filter((r) => !r.isComplete).length,
      leads: auditData.leads.filter((r) => !r.isComplete).length,
      invoices: auditData.invoices.filter((r) => !r.isComplete).length,
      transactions: auditData.transactions.filter((r) => !r.isComplete).length,
      payroll: auditData.payroll.filter((r) => !r.isComplete).length,
      profile: 0,
      company: auditData.company.filter((r) => !r.isComplete).length,
      billing: 0,
      team: auditData.team.filter((r) => !r.isComplete).length,
      integrations: 0,
      templates: 0,
    };
  }, [auditData]);

  const categories = [
    { id: "customers" as AuditCategory, label: "Customers", icon: Users, count: categoryCounts.customers },
    { id: "jobs" as AuditCategory, label: "Jobs/Schedule", icon: Briefcase, count: categoryCounts.jobs },
    { id: "leads" as AuditCategory, label: "Leads", icon: Target, count: categoryCounts.leads },
    { id: "invoices" as AuditCategory, label: "Invoices", icon: Receipt, count: categoryCounts.invoices },
    { id: "transactions" as AuditCategory, label: "Transactions", icon: Wallet, count: categoryCounts.transactions },
    { id: "payroll" as AuditCategory, label: "Payroll", icon: DollarSign, count: categoryCounts.payroll },
    { id: "team" as AuditCategory, label: "Team", icon: UserCheck, count: categoryCounts.team },
    { id: "company" as AuditCategory, label: "Company", icon: Building2, count: categoryCounts.company },
    { id: "profile" as AuditCategory, label: "Profile", icon: User, count: categoryCounts.profile },
    { id: "billing" as AuditCategory, label: "Billing", icon: CreditCard, count: categoryCounts.billing },
    { id: "integrations" as AuditCategory, label: "Integrations", icon: Plug, count: categoryCounts.integrations },
    { id: "templates" as AuditCategory, label: "Templates", icon: FileCode, count: categoryCounts.templates },
  ];

  const currentRecords = showOnlyIncomplete
    ? auditData[selectedCategory].filter((r) => !r.isComplete)
    : auditData[selectedCategory];

  // Pagination
  const totalPages = Math.ceil(currentRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = currentRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when category changes
  const handleCategoryChange = (category: AuditCategory) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const completeCount = auditData[selectedCategory].filter((r) => r.isComplete).length;
  const incompleteCount = auditData[selectedCategory].filter((r) => !r.isComplete).length;

  // Handle edit click based on category
  const handleEditClick = (record: AuditRecord) => {
    switch (record.category) {
      case "customers":
        setEditingCustomerId(record.id);
        break;
      case "jobs":
        setEditingJobId(record.id);
        break;
      case "staff":
      case "team":
        toast.info("Navegando para Team...");
        navigate("/settings?tab=team");
        break;
      case "estimates":
      case "leads":
        toast.info("Navegando para Leads...");
        navigate("/leads");
        break;
      case "invoices":
        setEditingInvoiceId(record.id);
        break;
      case "transactions":
        setEditingTransactionId(record.id);
        break;
      case "payroll":
        toast.info("Navegando para Payroll...");
        navigate("/payroll");
        break;
      case "company":
        toast.info("Navegando para Company Settings...");
        navigate("/settings?tab=company");
        break;
      case "profile":
        toast.info("Navegando para Profile...");
        navigate("/settings?tab=profile");
        break;
      case "billing":
        toast.info("Navegando para Billing...");
        navigate("/settings?tab=billing");
        break;
      case "integrations":
        toast.info("Navegando para Integrations...");
        navigate("/settings?tab=integrations");
        break;
      case "templates":
        toast.info("Navegando para Templates...");
        navigate("/settings?tab=templates");
        break;
    }
  };

  // Get record data for modals
  const editingCustomer = customers.find((c) => c.id === editingCustomerId);
  const editingJob = jobs.find((j) => j.id === editingJobId);
  const editingInvoice = invoices.find((i) => i.id === editingInvoiceId);
  const editingTransaction = transactions.find((t) => t.id === editingTransactionId);

  // Get empty state message
  const getEmptyStateMessage = (category: AuditCategory) => {
    switch (category) {
      case "profile":
        return "Profile audit será disponibilizado quando a autenticação estiver implementada.";
      case "billing":
        return "Nenhuma configuração de billing incompleta encontrada.";
      case "integrations":
        return "Verifique suas integrações na página de Integrations.";
      case "templates":
        return "Verifique seus templates na aba de Templates.";
      default:
        return t("audit.allCompleteDesc");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <ClipboardList className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("audit.totalRecords")}</p>
                <p className="text-2xl font-bold">{stats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("audit.completeRecords")}</p>
                <p className="text-2xl font-bold text-green-600">{stats.completeRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("audit.incompleteRecords")}</p>
                <p className="text-2xl font-bold text-orange-600">{stats.incompleteRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("audit.completionRate")}</p>
                <p className="text-2xl font-bold">{stats.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 text-xs">
                    {cat.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Audit List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Audit: {categories.find((c) => c.id === selectedCategory)?.label}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              {completeCount} {t("audit.complete")}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-300">
              <AlertTriangle className="w-3 h-3" />
              {incompleteCount} {t("audit.incomplete")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentRecords.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">{t("audit.allComplete")}</p>
              <p className="text-sm text-muted-foreground">{getEmptyStateMessage(selectedCategory)}</p>
              {(selectedCategory === "integrations" || selectedCategory === "templates" || selectedCategory === "profile" || selectedCategory === "billing") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleEditClick({ id: "", name: "", category: selectedCategory, missingFields: [], isComplete: true })}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Ver configurações
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t("audit.showing")} {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, currentRecords.length)} {t("audit.of")} {currentRecords.length}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t("audit.previous")}
                    </Button>
                    <span className="px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t("audit.next")}
                    </Button>
                  </div>
                )}
              </div>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {paginatedRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{record.name}</span>
                          {record.missingFields.length > 0 && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {record.missingFields.length} {t("audit.fields")}
                            </Badge>
                          )}
                          {record.isComplete && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("audit.complete")}
                            </Badge>
                          )}
                        </div>
                        {record.missingFields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {record.missingFields.map((field) => (
                              <Badge
                                key={field.key}
                                variant="secondary"
                                className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              >
                                {field.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 shrink-0"
                        onClick={() => handleEditClick(record)}
                      >
                        <Edit className="w-4 h-4" />
                        {t("audit.edit")}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("audit.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {t("audit.page")} {currentPage} {t("audit.of")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("audit.next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {editingCustomer && (
        <CustomerModal
          open={!!editingCustomerId}
          onOpenChange={(open) => !open && setEditingCustomerId(null)}
          customer={editingCustomer}
          mode="edit"
        />
      )}

      {editingJob && (
        <JobDetailsModal
          open={!!editingJobId}
          onOpenChange={(open) => !open && setEditingJobId(null)}
          job={{
            id: editingJob.id,
            customer: editingJob.customer_id,
            service: editingJob.service_type || "",
            date: editingJob.scheduled_date || "",
            time: editingJob.scheduled_time || "",
            staff1: editingJob.staff_assigned?.[0] || "",
            staff2: editingJob.staff_assigned?.[1] || "",
            status: editingJob.status,
            duration: editingJob.duration_text || "",
            amount: editingJob.amount?.toString() || "",
            address: editingJob.address || "",
            notes: editingJob.notes || "",
          }}
        />
      )}

      {editingInvoice && (
        <EditInvoiceModal
          open={!!editingInvoiceId}
          onOpenChange={(open) => !open && setEditingInvoiceId(null)}
          invoice={editingInvoice}
        />
      )}

      {editingTransaction && (
        <TransactionModal
          open={!!editingTransactionId}
          onOpenChange={(open) => !open && setEditingTransactionId(null)}
          transaction={{
            id: editingTransaction.id,
            name: editingTransaction.name,
            type: editingTransaction.type,
            category: editingTransaction.category,
            serviceType: editingTransaction.service_type || "",
            date: editingTransaction.date,
            amount: editingTransaction.amount,
            status: editingTransaction.status,
          }}
          mode="edit"
        />
      )}
    </div>
  );
}
