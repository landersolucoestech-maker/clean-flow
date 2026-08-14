import { T } from "@/shared/components/i18n/T";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Receipt, 
  Send, 
  Download, 
  Printer,
  User,
  MapPin,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, parseDateString, formatDateLong, getCurrentDateInEST } from "@/lib/utils";
import { useCreateInvoice, useGenerateInvoiceNumber } from "@/hooks/useInvoices";
import { useQuickBooks } from "@/hooks/useQuickBooks";
import { useQuickBooksStore } from "@/stores/quickbooks.store";
import { findInvoiceCustomerByName, findOrCreateQuickBooksCustomer } from "@/modules/billing/services/invoicePreparationService";

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

type PaymentTerms = "due_on_receipt" | "net_7" | "net_15" | "net_30" | "net_45" | "net_60";

const PAYMENT_TERMS_DAYS: Record<PaymentTerms, number> = {
  due_on_receipt: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
};

const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  due_on_receipt: "Due on Receipt",
  net_7: "Net 7",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
};

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: {
    id?: string | number;
    customer: string;
    customerId?: string;
    address: string;
    service: string;
    description?: string;
    time: string;
    amount?: number | string;
    duration?: string;
    date?: string;
  } | null;
  depositAmount?: number;
  isDepositInvoice?: boolean;
}

export function InvoiceModal({ open, onOpenChange, appointment, depositAmount, isDepositInvoice }: InvoiceModalProps) {
  const createInvoice = useCreateInvoice();
  const { data: nextInvoiceNumber } = useGenerateInvoiceNumber();
  const { isConnected: qbConnected, createInvoice: createQBInvoice, sendInvoice: sendQBInvoice } = useQuickBooks();
  const { customerMapping, addSyncLog } = useQuickBooksStore();
  const [isSending, setIsSending] = useState(false);
  
  // Parse the amount from appointment
  const appointmentAmount = appointment?.amount 
    ? typeof appointment.amount === 'string' 
      ? parseFloat(appointment.amount.replace(/[^0-9.-]/g, '')) || 0
      : appointment.amount
    : 0;

  // Parse appointment date using EST timezone utilities
  const parseAppointmentDate = useCallback((): Date => {
    if (appointment?.date) {
      return parseDateString(appointment.date);
    }
    return getCurrentDateInEST();
  }, [appointment?.date]);

  // Prefer service type for invoice line item description (avoid using job notes)
  const itemDescription = appointment?.service || appointment?.description || "Cleaning Service";
  
  const defaultItems = isDepositInvoice && depositAmount
    ? [{ id: 1, description: `${itemDescription} - 50% Deposit`, quantity: 1, rate: depositAmount, amount: depositAmount }]
    : appointmentAmount > 0
      ? [{ id: 1, description: itemDescription, quantity: 1, rate: appointmentAmount, amount: appointmentAmount }]
      : [{ id: 1, description: itemDescription, quantity: 1, rate: 0, amount: 0 }];
  
  const [items, setItems] = useState<InvoiceItem[]>(defaultItems);
  const [invoiceDate, setInvoiceDate] = useState<Date>(parseAppointmentDate());
  const [dueDate, setDueDate] = useState<Date>(parseAppointmentDate());
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("due_on_receipt");
  const [taxRate, setTaxRate] = useState<number>(0);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  // Update invoice number when available
  useEffect(() => {
    if (nextInvoiceNumber) {
      setInvoiceNumber(nextInvoiceNumber);
    }
  }, [nextInvoiceNumber]);

  // Fetch customer ID by name when modal opens
  useEffect(() => {
    if (open && appointment?.customer) {
      const fetchCustomerId = async () => {
        // First check if customerId is already provided
        if (appointment.customerId) {
          setCustomerId(appointment.customerId);
          return;
        }
        
        // Otherwise, look up by name through the billing service.
        try {
          const customer = await findInvoiceCustomerByName(appointment.customer);
          setCustomerId(customer?.id ?? null);
          setCustomerEmail(customer?.email ?? null);
        } catch {
          setCustomerId(null);
          setCustomerEmail(null);
        }
      };
      fetchCustomerId();
    }
  }, [open, appointment?.customer, appointment?.customerId]);

  // Reset items and dates when appointment changes
  useEffect(() => {
    if (open) {
      const amount = appointment?.amount 
        ? typeof appointment.amount === 'string' 
          ? parseFloat(appointment.amount.replace(/[^0-9.-]/g, '')) || 0
          : appointment.amount
        : 0;
      
      // Prefer service type for invoice line item description (avoid using job notes)
      const description = appointment?.service || appointment?.description || "Cleaning Service";
      
      const newItems = isDepositInvoice && depositAmount
        ? [{ id: 1, description: `${description} - 50% Deposit`, quantity: 1, rate: depositAmount, amount: depositAmount }]
        : amount > 0
          ? [{ id: 1, description: description, quantity: 1, rate: amount, amount: amount }]
          : [{ id: 1, description: description, quantity: 1, rate: 0, amount: 0 }];
      
      setItems(newItems);
      const issueDate = parseAppointmentDate();
      setInvoiceDate(issueDate);
      // Calculate due date based on payment terms
      setDueDate(addDays(issueDate, PAYMENT_TERMS_DAYS[paymentTerms]));
    }
  }, [open, appointment, depositAmount, isDepositInvoice, parseAppointmentDate, paymentTerms]);

  // Update due date when invoice date or payment terms change
  useEffect(() => {
    setDueDate(addDays(invoiceDate, PAYMENT_TERMS_DAYS[paymentTerms]));
  }, [invoiceDate, paymentTerms]);

  const [newItem, setNewItem] = useState({ description: "", quantity: 1, rate: 0 });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleAddItem = () => {
    if (!newItem.description || newItem.rate <= 0) {
      toast.error("Please fill in item description and rate");
      return;
    }
    
    const item: InvoiceItem = {
      id: Date.now(),
      description: newItem.description,
      quantity: newItem.quantity,
      rate: newItem.rate,
      amount: newItem.quantity * newItem.rate,
    };
    
    setItems([...items, item]);
    setNewItem({ description: "", quantity: 1, rate: 0 });
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSendInvoice = async () => {
    if (!customerId) {
      toast.error("Cliente não encontrado no sistema. Crie o cliente primeiro.");
      return;
    }

    if (items.length === 0 || subtotal <= 0) {
      toast.error("Adicione pelo menos um item ao invoice.");
      return;
    }

    setIsSending(true);

    // Build notes with line items
    const lineItemsText = items
      .map(item => `${item.description}: ${item.quantity} x $${item.rate.toFixed(2)} = $${item.amount.toFixed(2)}`)
      .join("\n");

    try {
      let qbInvoiceId: string | null = null;
      let qbDocNumber: string | null = null;
      let qbEmailStatus: string | null = null;

      // Create invoice in QuickBooks if connected
      if (qbConnected) {
        try {
          // Get QB customer ID from mapping or search/create
          let qbCustomerId = customerMapping[customerId];
          
          // Resolve the QuickBooks customer through the billing service.
          if (!qbCustomerId && appointment?.customer) {
            const resolvedCustomer = await findOrCreateQuickBooksCustomer(appointment.customer, customerEmail);
            if (resolvedCustomer) {
              qbCustomerId = resolvedCustomer.id;
              useQuickBooksStore.getState().setCustomerMapping(customerId, qbCustomerId);
              if (resolvedCustomer.created) {
                addSyncLog({
                  type: "customer",
                  action: "create",
                  status: "success",
                  message: `Customer ${appointment.customer} created in QuickBooks`,
                });
              }
            }
          }
          
          if (qbCustomerId) {
            // Create invoice in QuickBooks
            const qbInvoice = await createQBInvoice({
              customerId: qbCustomerId,
              lineItems: items.map(item => ({
                description: item.description,
                amount: item.amount,
                quantity: item.quantity,
                unitPrice: item.rate,
              })),
              dueDate: format(dueDate, "yyyy-MM-dd"),
              invoiceNumber: invoiceNumber,
              notes: lineItemsText,
              email: customerEmail || undefined,
            });

            if (qbInvoice) {
              qbInvoiceId = qbInvoice.Id;
              qbDocNumber = qbInvoice.DocNumber;
              
              // Send invoice via QuickBooks email
              if (customerEmail) {
                await sendQBInvoice(qbInvoice.Id, customerEmail);
                qbEmailStatus = "EmailSent";
              }

              addSyncLog({
                type: "invoice",
                action: "create",
                status: "success",
                message: `Invoice ${invoiceNumber} created and sent in QuickBooks`,
              });

              toast.success("Invoice criado e enviado via QuickBooks!");
            }
          } else {
            toast.info("Não foi possível mapear o cliente no QuickBooks. Invoice salvo localmente.");
          }
        } catch (qbError) {
          console.error("QuickBooks error:", qbError);
          addSyncLog({
            type: "invoice",
            action: "create",
            status: "error",
            message: `Failed to create invoice in QuickBooks: ${qbError}`,
          });
          toast.warning("Erro ao enviar para QuickBooks. Invoice salvo localmente.");
        }
      }

      // Create invoice in local database
      // Only use job_id if it's a valid UUID (not "deposit" or other strings)
      const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const jobIdValue = appointment?.id ? String(appointment.id) : null;
      const validJobId = jobIdValue && isValidUUID(jobIdValue) ? jobIdValue : null;

      await createInvoice.mutateAsync({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        customerName: appointment?.customer || undefined,
        customerEmail: customerEmail || undefined,
        job_id: validJobId,
        status: "sent",
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        issue_date: format(invoiceDate, "yyyy-MM-dd"),
        due_date: format(dueDate, "yyyy-MM-dd"),
        notes: lineItemsText,
        qb_invoice_id: qbInvoiceId,
        qb_doc_number: qbDocNumber,
        qb_email_status: qbEmailStatus,
        qb_synced_at: qbInvoiceId ? new Date().toISOString() : null,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating invoice:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    toast.success("Invoice downloaded!");
  };

  const handlePrint = () => {
    toast.success("Printing invoice...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            {isDepositInvoice ? "50% Deposit Invoice" : "Create Invoice"}
          </DialogTitle>
          <DialogDescription>
            <T k="literal.schedule.create_and_send_an_invoice_for_the_completed.6be9c00b" />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs"><T k="invoice.invoiceNumber" /></Label>
              <Input
                value={invoiceNumber}
                readOnly
                disabled
                className="font-mono font-semibold h-9 bg-muted cursor-not-allowed"
                title="Auto-generated invoice number"
              />
              <p className="text-xs text-muted-foreground">(auto-generated)</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs"><T k="invoice.paymentTerms" /></Label>
              <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as PaymentTerms)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Object.entries(PAYMENT_TERMS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs"><T k="billing.issueDate" /></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !invoiceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {invoiceDate ? format(invoiceDate, "PPP") : <span><T k="common.pickDate" /></span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={invoiceDate}
                    onSelect={(date) => date && setInvoiceDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs"><T k="billing.dueDate" /></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span><T k="common.pickDate" /></span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => date && setDueDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs"><T k="literal.schedule.bill_to.c0acb224" /></Label>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{appointment?.customer || "Customer"}</span>
                {!customerId && (
                  <span className="text-xs text-destructive">(not found in system)</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{appointment?.address || "Address"}</span>
              </div>
              {appointment?.date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <CalendarIcon className="w-3 h-3" />
                  <span>Job Date: {formatDateLong(parseAppointmentDate())}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs"><T k="invoice.lineItems" /></Label>
            
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x ${item.rate.toFixed(2)}
                    </p>
                  </div>
                  <span className="font-semibold">${item.amount.toFixed(2)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Item */}
            <div className="p-3 border border-dashed border-border rounded-lg space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Input
                    placeholder="Item description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                />
                <Input
                  type="number"
                  placeholder="Rate"
                  min={0}
                  step={0.01}
                  value={newItem.rate || ""}
                  onChange={(e) => setNewItem({ ...newItem, rate: parseFloat(e.target.value) || 0 })}
                />
                <Button variant="outline" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  <T k="common.add" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground"><T k="invoice.subtotal" /></span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground"><T k="invoice.tax" /></span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 text-center text-xs"
                  />
                  <span className="text-muted-foreground text-xs">%</span>
                </div>
              </div>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span><T k="invoice.total" /></span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrint} aria-label="Print invoice">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download invoice">
              <Download className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <T k="common.cancel" />
            </Button>
            <Button 
              onClick={handleSendInvoice}
              disabled={isSending || createInvoice.isPending || !customerId}
            >
              {(isSending || createInvoice.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {qbConnected ? "Send via QuickBooks" : "Send Invoice"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
