import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DatePickerString } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  DollarSign,
  Send,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/useLanguage";
import { parseDateString, formatDateToISO } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuickBooksSync } from "@/hooks/useQuickBooksSync";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string | null;
  lead_id: string | null;
  status: string;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number | null;
  amount_paid: number | null;
  issue_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  qb_synced_at?: string | null;
  qb_email_status?: string | null;
  reminder_sent_at?: string | null;
  customer?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

interface EditInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  mode?: "view" | "edit";
}

// Use centralized service types from serviceEnums
import { SERVICE_TYPES } from "@/lib/serviceEnums";

const services = [
  { name: "Regular Cleaning", price: 120 },
  { name: "Deep Cleaning", price: 180 },
  { name: "First Cleaning", price: 200 },
  { name: "One-Time Cleaning", price: 180 },
  { name: "Move-In / Move-Out Cleaning", price: 280 },
  { name: "Office Cleaning", price: 200 },
  { name: "Commercial Cleaning", price: 250 },
  { name: "Post-Construction Cleaning", price: 350 },
  { name: "Cleaning for a Reason", price: 150 },
];

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function EditInvoiceModal({ open, onOpenChange, invoice, mode = "edit" }: EditInvoiceModalProps) {
  const isViewOnly = mode === "view";
  const { t } = useLanguage();
  const { syncInvoiceToQuickBooks, isConnected: qbConnected } = useQuickBooksSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    customer: "",
    issueDate: "",
    dueDate: "",
    paymentTerms: "due_on_receipt",
    jobId: "",
    status: "sent",
    notes: "",
    resendToCustomer: false,
    syncToQB: true,
    taxRate: 0,
    totalPayment: 0,
    createdDate: "",
    sentDate: "",
    openDate: "",
    paidDate: "",
    receiptDate: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [jobServiceType, setJobServiceType] = useState<string | null>(null);

  const paymentTermsOptions = [
    { value: "due_on_receipt", label: t("invoice.dueOnReceipt") },
    { value: "net15", label: "Net 15" },
    { value: "net30", label: "Net 30" },
    { value: "net45", label: "Net 45" },
    { value: "net60", label: "Net 60" },
  ];

  const statusOptions = [
    { value: "draft", label: t("invoice.statusDraft") },
    { value: "sent", label: t("invoice.statusSent") },
    { value: "payment_pending", label: t("invoice.statusPaymentPending") },
    { value: "paid", label: t("invoice.statusPaid") },
    { value: "complete", label: t("invoice.statusComplete") },
    { value: "overdue", label: t("invoice.statusOverdue") },
  ];

  // Parse amount from invoice to initialize line items
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!invoice) return;
      
      const amountValue = invoice.total || 0;
      
      // Fetch job description if job_id exists
      let jobDescription = "Cleaning Service";
      let serviceType: string | null = null;
      if (invoice.job_id) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('description, title, service_type')
          .eq('id', invoice.job_id)
          .single();
        
        if (jobData) {
          serviceType = jobData.service_type || null;
          jobDescription = jobData.service_type || jobData.description || jobData.title || "Cleaning Service";
          setJobServiceType(serviceType);
        }
      }
      
      // Derive timeline dates from available data
      const createdDate = invoice.created_at 
        ? formatDateToISO(parseDateString(invoice.created_at.split('T')[0])) 
        : '';
      
      // Sent date: use qb_synced_at, reminder_sent_at, or issue_date for sent invoices
      let sentDate = '';
      if (invoice.qb_synced_at) {
        sentDate = formatDateToISO(parseDateString(invoice.qb_synced_at.split('T')[0]));
      } else if (invoice.reminder_sent_at) {
        sentDate = formatDateToISO(parseDateString(invoice.reminder_sent_at.split('T')[0]));
      } else if (invoice.status !== 'draft' && invoice.issue_date) {
        sentDate = formatDateToISO(parseDateString(invoice.issue_date));
      }
      
      // Open date: use qb_email_status if available (EmailSent means it was opened by QB)
      const openDate = invoice.qb_email_status === 'EmailSent' && sentDate ? sentDate : '';
      
      // Paid date: if status is paid, use updated_at or amount_paid > 0
      let paidDate = '';
      if (invoice.status === 'paid' || (invoice.amount_paid && invoice.amount_paid > 0)) {
        paidDate = formatDateToISO(parseDateString(invoice.updated_at.split('T')[0]));
      }
      
      // Receipt date: same as paid date if fully paid
      const receiptDate = invoice.status === 'paid' && invoice.total && invoice.amount_paid === invoice.total 
        ? paidDate 
        : '';
      
      setFormData({
        customer: invoice.customer?.name || 'Unknown',
        issueDate: invoice.issue_date || '',
        dueDate: invoice.due_date || '',
        paymentTerms: "due_on_receipt",
        jobId: invoice.job_id || '',
        status: invoice.status,
        notes: invoice.notes || '',
        resendToCustomer: false,
        syncToQB: true,
        taxRate: invoice.tax_rate || 0,
        totalPayment: invoice.amount_paid || 0,
        createdDate,
        sentDate,
        openDate,
        paidDate,
        receiptDate,
      });

      // Initialize with a single line item with the job description and invoice amount
      setLineItems([
        { id: "1", description: jobDescription, quantity: 1, unitPrice: amountValue },
      ]);
    };
    
    loadInvoiceData();
  }, [invoice]);


  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSave = async () => {
    if (lineItems.every((item) => item.unitPrice === 0)) {
      toast.error(t("invoice.pleaseAddLineItemValue"));
      return;
    }

    if (!invoice) return;

    try {
      // Update local invoice first
      const total = subtotal + (subtotal * formData.taxRate / 100);
      await supabase
        .from("invoices")
        .update({
          status: formData.status,
          issue_date: formData.issueDate || null,
          due_date: formData.dueDate || null,
          tax_rate: formData.taxRate,
          subtotal: subtotal,
          tax_amount: subtotal * formData.taxRate / 100,
          total: total,
          notes: formData.notes || null,
        })
        .eq("id", invoice.id);

      toast.success(t("invoice.updatedSuccessfully"));

      // Sync to QuickBooks if enabled
      if (formData.syncToQB && qbConnected) {
        setIsSyncing(true);
        const result = await syncInvoiceToQuickBooks(
          invoice.id,
          invoice.customer_id,
          invoice.customer?.name || "Unknown",
          invoice.customer?.email || null,
          null, // phone
          total,
          invoice.invoice_number,
          formData.notes || lineItems[0]?.description
        );
        setIsSyncing(false);

        if (!result.success) {
          toast.error("Falha ao sincronizar com QuickBooks", {
            description: result.error,
          });
        }
      } else if (formData.syncToQB && !qbConnected) {
        toast.warning("QuickBooks não conectado. Invoice salvo apenas localmente.");
      }

      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error saving invoice:", error);
      toast.error("Erro ao salvar invoice");
      setIsSyncing(false);
    }
  };

  const handleResend = async () => {
    if (!invoice || !qbConnected) {
      toast.error("QuickBooks não conectado");
      return;
    }

    setIsSyncing(true);
    const result = await syncInvoiceToQuickBooks(
      invoice.id,
      invoice.customer_id,
      invoice.customer?.name || "Unknown",
      invoice.customer?.email || null,
      null,
      invoice.total || 0,
      invoice.invoice_number,
      formData.notes || lineItems[0]?.description
    );
    setIsSyncing(false);

    if (result.success) {
      toast.success(`Invoice enviado para ${formData.customer}`);
    }
  };

  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "sent": return "secondary";
      case "payment_pending": return "secondary";
      case "complete": return "default";
      case "overdue": return "destructive";
      case "draft": return "outline";
      default: return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {isViewOnly ? "View Invoice" : t("invoice.edit")} {invoice.invoice_number}
            </DialogTitle>
            <Badge variant={getStatusColor(formData.status)}>
              {formData.status.replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info (Read-only) */}
          <div className="p-4 rounded-lg border bg-muted/30">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t("invoice.customer")}</Label>
                <p className="font-medium text-foreground">{formData.customer}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t("invoice.invoiceNumber")}</Label>
                <Input
                  value={invoice.invoice_number}
                  placeholder="INV-001"
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("invoice.issueDate")}</Label>
              <DatePickerString
                value={formData.issueDate}
                onChange={(value) =>
                  setFormData({ ...formData, issueDate: value })
                }
                placeholder={t("invoice.selectIssueDate")}
                disabled={isViewOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("invoice.paymentTerms")}</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) =>
                  setFormData({ ...formData, paymentTerms: value })
                }
                disabled={isViewOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {paymentTermsOptions.map((term) => (
                    <SelectItem key={term.value} value={term.value}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("invoice.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                disabled={isViewOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Job ID</Label>
            <Input
              value={formData.jobId ? formData.jobId.slice(0, 8) : ''}
              placeholder="JOB-001"
              maxLength={8}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("invoice.lineItems")}</Label>
              {!isViewOnly && (
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("invoice.addItem")}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 items-start"
                >
                  <div className="col-span-5 space-y-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">
                        {t("invoice.description")}
                      </Label>
                    )}
                    <Select
                      value={item.description}
                      onValueChange={(value) => {
                        const service = services.find((s) => s.name === value);
                        updateLineItem(item.id, "description", value);
                        if (service) {
                          updateLineItem(item.id, "unitPrice", service.price);
                        }
                      }}
                      disabled={isViewOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("invoice.selectService")} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {jobServiceType && (
                          <SelectItem value={jobServiceType}>{jobServiceType}</SelectItem>
                        )}
                        {!jobServiceType && (
                          <SelectItem value="Cleaning Service">{t("invoice.cleaningService")}</SelectItem>
                        )}
                        {services
                          .filter(service => service.name !== jobServiceType)
                          .map((service) => (
                          <SelectItem key={service.name} value={service.name}>
                            {service.name} - ${service.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">{t("invoice.qty")}</Label>
                    )}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)
                      }
                      disabled={isViewOnly}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">
                        {t("invoice.unitPrice")}
                      </Label>
                    )}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      disabled={isViewOnly}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">{t("invoice.total")}</Label>
                    )}
                    <div className="h-10 flex items-center font-medium">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>

                  {!isViewOnly && (
                    <div className="col-span-1 space-y-1">
                      {index === 0 && <Label className="text-xs invisible">X</Label>}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("invoice.subtotal")}</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("invoice.tax")}</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-7 text-xs"
                    disabled={isViewOnly}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <span className="font-medium">${(subtotal * formData.taxRate / 100).toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t("invoice.totalCharges")}</span>
                <span className="font-semibold">${(subtotal + (subtotal * formData.taxRate / 100)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Invoice Dates Grid */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t("invoice.timeline")}</Label>
            <div className="grid grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("invoice.created")}</Label>
                <DatePickerString
                  value={formData.createdDate}
                  onChange={(value) => setFormData({ ...formData, createdDate: value })}
                  placeholder="--"
                  buttonClassName="h-9 text-xs"
                  disabled={isViewOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("invoice.sent")}</Label>
                <DatePickerString
                  value={formData.sentDate}
                  onChange={(value) => setFormData({ ...formData, sentDate: value })}
                  placeholder="--"
                  buttonClassName="h-9 text-xs"
                  disabled={isViewOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("invoice.open")}</Label>
                <DatePickerString
                  value={formData.openDate}
                  onChange={(value) => setFormData({ ...formData, openDate: value })}
                  placeholder="--"
                  buttonClassName="h-9 text-xs"
                  disabled={isViewOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("invoice.paid")}</Label>
                <DatePickerString
                  value={formData.paidDate}
                  onChange={(value) => setFormData({ ...formData, paidDate: value })}
                  placeholder="--"
                  buttonClassName="h-9 text-xs"
                  disabled={isViewOnly}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("invoice.receipt")}</Label>
                <DatePickerString
                  value={formData.receiptDate}
                  onChange={(value) => setFormData({ ...formData, receiptDate: value })}
                  placeholder="--"
                  buttonClassName="h-9 text-xs"
                  disabled={isViewOnly}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("invoice.notesOptional")}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("invoice.notesChangesPlaceholder")}
              rows={3}
              disabled={isViewOnly}
            />
          </div>

          {/* Options - Hide in view mode */}
          {!isViewOnly && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("invoice.resendToCustomer")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("invoice.resendToCustomerDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.resendToCustomer}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, resendToCustomer: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("invoice.syncToQB")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("invoice.syncToQBDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.syncToQB}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, syncToQB: checked })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isViewOnly && (
            <Button 
              variant="outline" 
              onClick={handleResend} 
              className="sm:mr-auto"
              disabled={isSyncing || !qbConnected}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {t("invoice.resendNow")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            {isViewOnly ? "Close" : t("invoice.cancel")}
          </Button>
          {!isViewOnly && (
            <Button onClick={handleSave} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t("invoice.saveChanges")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
