import { useState, useMemo, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  DollarSign,
  Loader2,
} from "lucide-react";
import { cn, getCurrentDateInEST, formatDateToISO, formatDateDisplay } from "@/lib/utils";
import { toast } from "sonner";
import { DatePickerString } from "@/components/ui/date-picker";
import { useLanguage } from "@/contexts/useLanguage";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreateInvoice, useGenerateInvoiceNumber } from "@/hooks/useInvoices";
import { useJobs } from "@/hooks/useJobs";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export type InvoiceType = 'deposit' | 'balance' | 'standard';

export interface InvoiceInitialData {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  amount?: number;
  notes?: string;
  leadId?: string;
  invoiceType?: InvoiceType;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: InvoiceInitialData;
}


interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function CreateInvoiceModal({ open, onOpenChange, initialData }: CreateInvoiceModalProps) {
  const { t } = useLanguage();
  const [customerOpen, setCustomerOpen] = useState(false);
  const todayISO = formatDateToISO(getCurrentDateInEST());
  
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    issueDate: todayISO,
    paymentTerms: "due_on_receipt",
    jobId: "",
    notes: "",
    taxRate: 0,
    leadId: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0 },
  ]);

  // Update form when initialData changes or modal opens
  useEffect(() => {
    if (initialData && open) {
      setFormData(prev => ({
        ...prev,
        customerId: initialData.customerId || "",
        customerName: initialData.customerName || "",
        customerEmail: initialData.customerEmail || "",
        notes: initialData.notes || "",
        leadId: initialData.leadId || "",
      }));
      if (initialData.description || initialData.amount) {
        setLineItems([{
          id: "1",
          description: initialData.description || "",
          quantity: 1,
          unitPrice: initialData.amount || 0,
        }]);
      }
    }
  }, [initialData, open]);

  // Fetch real data from database
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: jobs = [] } = useJobs();
  const { data: nextInvoiceNumber } = useGenerateInvoiceNumber();
  const { data: companySettings } = useCompanySettings();
  const createInvoice = useCreateInvoice();

  // Sort customers alphabetically
  const sortedCustomers = useMemo(() => 
    [...customers].sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );

  // Filter jobs for selected customer
  const customerJobs = useMemo(() => 
    jobs.filter(job => job.customer_id === formData.customerId && job.status === "completed"),
    [jobs, formData.customerId]
  );

  const paymentTermsOptions = [
    { value: "due_on_receipt", label: t("invoice.dueOnReceipt") },
    { value: "net15", label: "Net 15" },
    { value: "net30", label: "Net 30" },
    { value: "net45", label: "Net 45" },
    { value: "net60", label: "Net 60" },
  ];

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    setFormData({
      ...formData,
      customerId: customerId,
      customerName: customer?.name || "",
      customerEmail: customer?.email || "",
      jobId: "", // Reset job when customer changes
    });
  };

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

  const taxAmount = subtotal * formData.taxRate / 100;
  const total = subtotal + taxAmount;

  // Calculate due date based on payment terms
  const calculateDueDate = (issueDate: string, terms: string): string => {
    const date = new Date(issueDate);
    switch (terms) {
      case "net15":
        date.setDate(date.getDate() + 15);
        break;
      case "net30":
        date.setDate(date.getDate() + 30);
        break;
      case "net45":
        date.setDate(date.getDate() + 45);
        break;
      case "net60":
        date.setDate(date.getDate() + 60);
        break;
      default: // due_on_receipt
        break;
    }
    return formatDateToISO(date);
  };

  const handleCreateInvoice = async () => {
    if (!formData.customerId) {
      toast.error(t("invoice.pleaseSelectCustomer"));
      return;
    }

    if (lineItems.every((item) => !item.description || item.unitPrice === 0)) {
      toast.error(t("invoice.pleaseAddLineItem"));
      return;
    }

    const dueDate = calculateDueDate(formData.issueDate, formData.paymentTerms);
    
    // Build notes from line items
    const notesFromItems = lineItems
      .filter(item => item.description)
      .map(item => `${item.description}: ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${(item.quantity * item.unitPrice).toFixed(2)}`)
      .join("\n");

    const finalNotes = formData.notes 
      ? `${notesFromItems}\n\n${formData.notes}`
      : notesFromItems;

    try {
      // Get customer phone and email for notifications
      const customer = customers.find((c) => c.id === formData.customerId);
      const customerPhone = customer?.phone || customer?.phone2 || undefined;
      const customerEmail = customer?.email || undefined;

      await createInvoice.mutateAsync({
        invoice_number: nextInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        customer_id: formData.customerId,
        customerName: formData.customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        companyName: companySettings?.trade_name || companySettings?.legal_name || "Our Company",
        job_id: formData.jobId || null,
        lead_id: formData.leadId || null,
        status: "sent",
        subtotal: subtotal,
        tax_rate: formData.taxRate,
        tax_amount: taxAmount,
        total: total,
        issue_date: formData.issueDate,
        due_date: dueDate,
        notes: finalNotes,
        invoice_type: initialData?.invoiceType || "standard",
      });

      // Reset form and close
      setFormData({
        customerId: "",
        customerName: "",
        customerEmail: "",
        issueDate: formatDateToISO(getCurrentDateInEST()),
        paymentTerms: "due_on_receipt",
        jobId: "",
        notes: "",
        taxRate: 0,
        leadId: "",
      });
      setLineItems([{ id: "1", description: "", quantity: 1, unitPrice: 0 }]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating invoice:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {t("invoice.createNew")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("invoice.customer")} *</Label>
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingCustomers}
                  >
                    {loadingCustomers ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      formData.customerName || t("invoice.selectCustomer")
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("invoice.searchCustomer")} />
                    <CommandList>
                      <CommandEmpty>{t("invoice.noCustomerFound")}</CommandEmpty>
                      <CommandGroup>
                        {sortedCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              handleCustomerChange(customer.id);
                              setCustomerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.customerId === customer.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.email || "No email"}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("invoice.jobId")}</Label>
              <Select
                value={formData.jobId}
                onValueChange={(value) => {
                  const job = customerJobs.find((j) => j.id === value);
                  if (job) {
                    setLineItems([
                      { 
                        id: "1", 
                        description: job.service_type || "Cleaning Service", 
                        quantity: 1, 
                        unitPrice: job.amount || 0 
                      },
                    ]);
                  }
                  setFormData({ ...formData, jobId: value });
                }}
                disabled={!formData.customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.customerId ? t("invoice.selectJob") : t("invoice.selectCustomerFirst")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {customerJobs.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No completed jobs
                    </SelectItem>
                  ) : (
                    customerJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <span className="font-mono">{job.id.slice(0, 8)}</span>
                        <span className="text-muted-foreground ml-2">• {job.title}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("invoice.issueDate")} *</Label>
              <DatePickerString
                value={formData.issueDate}
                onChange={(value) =>
                  setFormData({ ...formData, issueDate: value })
                }
                placeholder={t("invoice.selectIssueDate")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("invoice.paymentTerms")}</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) =>
                  setFormData({ ...formData, paymentTerms: value })
                }
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
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">{t("invoice.lineItems")}</Label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-2" />
                {t("invoice.addItem")}
              </Button>
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
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                      placeholder={t("invoice.descriptionPlaceholder") || "Enter service description"}
                    />
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
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <span className="font-medium">${taxAmount.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold">{t("invoice.totalDue")}</span>
                <span className="text-lg font-bold text-foreground">
                  ${total.toFixed(2)}
                </span>
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
              placeholder={t("invoice.notesPlaceholder")}
              rows={3}
            />
          </div>

          {/* Invoice Number Preview */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Invoice Number:</span>
            <span className="font-mono font-semibold">{nextInvoiceNumber || "Loading..."}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("invoice.cancel")}
          </Button>
          <Button 
            onClick={handleCreateInvoice}
            disabled={createInvoice.isPending}
          >
            {createInvoice.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("invoice.createInvoice")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
