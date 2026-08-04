import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSendNotificationSMS, getNotificationMessage } from "./useSendNotificationSMS";
import { useSendInvoiceEmail } from "./useSendEmail";

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string | null;
  lead_id: string | null;
  invoice_type?: InvoiceType | null;
  status: string;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number | null;
  amount_paid: number | null;
  issue_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // QuickBooks fields
  qb_invoice_id?: string | null;
  qb_doc_number?: string | null;
  qb_email_status?: string | null;
  qb_balance?: number | null;
  qb_synced_at?: string | null;
  auto_generated?: boolean | null;
  reminder_sent_at?: string | null;
  overdue_reminder_sent_at?: string | null;
  customer?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

export type InvoiceType = 'deposit' | 'balance' | 'standard';

export interface InvoiceFormData {
  invoice_number: string;
  customer_id: string;
  job_id?: string | null;
  lead_id?: string | null;
  status?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid?: number;
  issue_date: string;
  due_date: string;
  notes?: string | null;
  invoice_type?: InvoiceType;
  qb_invoice_id?: string | null;
  qb_doc_number?: string | null;
  qb_email_status?: string | null;
  qb_synced_at?: string | null;
  auto_generated?: boolean;
}

// Fetch all invoices with customer info
export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(id, name, email)
        `)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });
}

// Fetch invoices for a specific customer
export function useInvoicesByCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["invoices", "customer", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(id, name, email)
        `)
        .eq("customer_id", customerId)
        .order("issue_date", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!customerId,
  });
}

// Create a new invoice and create a pending transaction
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const sendNotification = useSendNotificationSMS();
  const { sendInvoiceEmail } = useSendInvoiceEmail();

  return useMutation({
    mutationFn: async (formData: InvoiceFormData & { 
      customerName?: string; 
      customerPhone?: string;
      customerEmail?: string;
      companyName?: string;
    }) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: formData.invoice_number,
          customer_id: formData.customer_id,
          job_id: formData.job_id || null,
          lead_id: formData.lead_id || null,
          status: formData.status || "sent",
          subtotal: formData.subtotal,
          tax_rate: formData.tax_rate,
          tax_amount: formData.tax_amount,
          total: formData.total,
          amount_paid: formData.amount_paid || 0,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          notes: formData.notes || null,
          invoice_type: formData.invoice_type || "standard",
          qb_invoice_id: formData.qb_invoice_id || null,
          qb_doc_number: formData.qb_doc_number || null,
          qb_email_status: formData.qb_email_status || null,
          qb_synced_at: formData.qb_synced_at || null,
          auto_generated: formData.auto_generated || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Create a pending transaction for the invoice
      const transactionName = formData.customerName
        ? `Invoice - ${formData.customerName} (${formData.invoice_number})`
        : `Invoice ${formData.invoice_number}`;

      const status = formData.status === "paid" ? "concluido" : "pendente";

      await supabase.from("transactions").insert({
        name: transactionName,
        description: `Invoice ${formData.invoice_number} enviado`,
        date: formData.issue_date,
        category: "Cleaning Revenue",
        status: status,
        amount: formData.total,
        type: "receita",
        notes: `Invoice ID: ${data.id}`,
      });

      return { 
        ...data, 
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        companyName: formData.companyName,
      };
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Invoice criado e enviado!");

      // Send email notification if customer has email
      if (variables.customerEmail && variables.customerName) {
        try {
          await sendInvoiceEmail({
            customerEmail: variables.customerEmail,
            customerName: variables.customerName,
            invoiceNumber: variables.invoice_number,
            amount: variables.total,
            dueDate: variables.due_date,
            companyName: variables.companyName || "MH Cleaning Services",
          });
          toast.success(`Email enviado para ${variables.customerEmail}`);
        } catch (emailError) {
          console.error("Error sending invoice email:", emailError);
          toast.error("Invoice criado, mas erro ao enviar email");
        }
      }

      // Send SMS notification if customer has phone
      if (variables.customerPhone && variables.customerName) {
        const message = getNotificationMessage("invoice_sent", {
          customerName: variables.customerName,
          invoiceNumber: variables.invoice_number,
          invoiceAmount: variables.total,
          dueDate: variables.due_date,
          companyName: variables.companyName || "Our Company",
        });

        sendNotification.mutate({
          customerId: variables.customer_id,
          customerPhone: variables.customerPhone,
          customerName: variables.customerName,
          message,
          notificationType: "invoice_sent",
          showToast: true,
        });
      }
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Erro ao criar invoice");
    },
  });
}

// Update an existing invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: Partial<InvoiceFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          ...formData,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice atualizado!");
    },
    onError: (error) => {
      console.error("Error updating invoice:", error);
      toast.error("Erro ao atualizar invoice");
    },
  });
}

// Update invoice status
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, amount_paid }: { id: string; status: string; amount_paid?: number }) => {
      const updateData: { status: string; amount_paid?: number } = { status };
      if (amount_paid !== undefined) {
        updateData.amount_paid = amount_paid;
      }

      const { data, error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Status do invoice atualizado!");
    },
    onError: (error) => {
      console.error("Error updating invoice status:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}

// Delete an invoice and its corresponding transaction
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, delete the corresponding transaction
      await supabase
        .from("transactions")
        .delete()
        .like("notes", `%Invoice ID: ${id}%`);

      // Then delete the invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Invoice e transação excluídos!");
    },
    onError: (error) => {
      console.error("Error deleting invoice:", error);
      toast.error("Erro ao excluir invoice");
    },
  });
}

// Generate next invoice number
export function useGenerateInvoiceNumber() {
  return useQuery({
    queryKey: ["invoices", "next-number"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastNumber = data[0].invoice_number;
        const match = lastNumber.match(/(\d+)$/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          return `INV-${String(nextNum).padStart(6, "0")}`;
        }
      }
      
      return "INV-000001";
    },
  });
}

// Sync invoices with QuickBooks
export function useSyncInvoicesWithQB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accessToken, realmId }: { accessToken: string; realmId: string }) => {
      const { data, error } = await supabase.functions.invoke("quickbooks-sync-invoices", {
        body: { action: "sync-all", accessToken, realmId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(data.message || "Invoices sincronizados!");
    },
    onError: (error) => {
      console.error("Error syncing invoices:", error);
      toast.error("Erro ao sincronizar invoices");
    },
  });
}

// Mark invoice as paid (syncs with QuickBooks) and updates transaction status
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  const sendNotification = useSendNotificationSMS();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      qbInvoiceId, 
      amount, 
      customerId,
      customerName,
      customerPhone,
      invoiceNumber,
      serviceType,
      companyName,
      accessToken, 
      realmId 
    }: { 
      invoiceId: string; 
      qbInvoiceId?: string | null;
      amount: number;
      customerId: string;
      customerName?: string;
      customerPhone?: string;
      invoiceNumber?: string;
      serviceType?: string;
      companyName?: string;
      accessToken?: string; 
      realmId?: string;
    }) => {
      let invoiceData;
      
      if (accessToken && realmId && qbInvoiceId) {
        // Sync with QuickBooks
        const { data, error } = await supabase.functions.invoke("quickbooks-sync-invoices", {
          body: { 
            action: "mark-paid", 
            invoiceId, 
            qbInvoiceId, 
            amount, 
            customerId,
            accessToken, 
            realmId 
          },
        });
        if (error) throw error;
        invoiceData = data;
      } else {
        // Local only update
        const { data, error } = await supabase
          .from("invoices")
          .update({ status: "paid", amount_paid: amount })
          .eq("id", invoiceId)
          .select()
          .single();
        if (error) throw error;
        invoiceData = data;
      }

      // If invoice is linked to a lead, update the lead's invoice_paid status
      if (invoiceData?.lead_id) {
        await supabase
          .from("leads")
          .update({ 
            invoice_paid: true,
            invoice_paid_at: new Date().toISOString()
          })
          .eq("id", invoiceData.lead_id);
      }

      // Update existing transaction status to "concluido" or create if doesn't exist
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .like("notes", `%Invoice ID: ${invoiceId}%`)
        .maybeSingle();

      if (existingTx) {
        // Update existing transaction
        await supabase
          .from("transactions")
          .update({ status: "concluido" })
          .eq("id", existingTx.id);
      } else {
        // Create new transaction if doesn't exist (legacy invoices)
        const transactionName = customerName 
          ? `Invoice - ${customerName}${invoiceNumber ? ` (${invoiceNumber})` : ''}`
          : `Invoice ${invoiceNumber || invoiceId.slice(0, 8)}`;

        await supabase.from("transactions").insert({
          name: transactionName,
          description: `Invoice ${invoiceNumber || invoiceId.slice(0, 8)}`,
          date: new Date().toISOString().split('T')[0],
          category: "Cleaning Revenue",
          status: "concluido",
          amount: amount,
          type: "receita",
          service_type: serviceType || null,
          notes: `Invoice ID: ${invoiceId}`,
        });
      }

      return { 
        ...invoiceData, 
        customerName,
        customerPhone,
        invoiceNumber,
        amount,
        companyName,
        customerId,
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Invoice marcado como pago!");

      // Send payment confirmation SMS if customer has phone
      if (data.customerPhone && data.customerName) {
        const message = getNotificationMessage("payment_confirmation", {
          customerName: data.customerName,
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.amount,
          companyName: data.companyName || "Our Company",
        });

        sendNotification.mutate({
          customerId: data.customerId,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          message,
          notificationType: "payment_confirmation",
          showToast: true,
        });
      }
    },
    onError: (error) => {
      console.error("Error marking invoice as paid:", error);
      toast.error("Erro ao marcar como pago");
    },
  });
}

// Send invoice reminder
export function useSendInvoiceReminder() {
  const queryClient = useQueryClient();
  const sendNotification = useSendNotificationSMS();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      type,
      customerPhone,
      customerName,
      customerId,
      invoiceNumber,
      invoiceAmount,
      dueDate,
      companyName,
    }: { 
      invoiceId: string; 
      type: "upcoming" | "overdue";
      customerPhone?: string;
      customerName?: string;
      customerId?: string;
      invoiceNumber?: string;
      invoiceAmount?: number;
      dueDate?: string;
      companyName?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("invoice-reminders", {
        body: { action: "send-single", invoiceId, type },
      });

      if (error) throw error;
      return { 
        ...data, 
        customerPhone, 
        customerName, 
        customerId,
        invoiceNumber,
        invoiceAmount,
        dueDate,
        companyName,
        type,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Lembrete enviado!");

      // Send reminder SMS if customer has phone
      if (data.customerPhone && data.customerName && data.customerId) {
        const message = getNotificationMessage("invoice_reminder", {
          customerName: data.customerName,
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
          dueDate: data.dueDate,
          companyName: data.companyName || "Our Company",
        });

        sendNotification.mutate({
          customerId: data.customerId,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          message,
          notificationType: "invoice_reminder",
          showToast: true,
        });
      }
    },
    onError: (error) => {
      console.error("Error sending reminder:", error);
      toast.error("Erro ao enviar lembrete");
    },
  });
}

// Auto-generate invoice for completed job
export function useAutoGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      jobId, 
      accessToken, 
      realmId, 
      qbCustomerId 
    }: { 
      jobId: string; 
      accessToken?: string; 
      realmId?: string; 
      qbCustomerId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("auto-generate-invoice", {
        body: { jobId, accessToken, realmId, qbCustomerId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(data.message || "Invoice gerado automaticamente!");
    },
    onError: (error) => {
      console.error("Error auto-generating invoice:", error);
      toast.error("Erro ao gerar invoice automaticamente");
    },
  });
}

// Sync all invoices to transactions (auto-runs on Transactions page load)
export function useSyncInvoicesToTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get ALL invoices with job service_type
      const { data: allInvoices, error: invError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          total,
          amount_paid,
          issue_date,
          customer:customers(id, name),
          job:jobs(service_type)
        `);

      if (invError) throw invError;

      // Get all existing transactions that reference invoices
      const { data: existingTx, error: txError } = await supabase
        .from("transactions")
        .select("id, notes, status")
        .like("notes", "Invoice ID:%");

      if (txError) throw txError;

      // Build a map of invoice ID -> transaction for existing transactions
      const existingTxMap = new Map<string, { id: string; status: string }>();
      (existingTx || []).forEach(tx => {
        const match = tx.notes?.match(/Invoice ID: ([a-f0-9-]+)/);
        if (match) {
          existingTxMap.set(match[1], { id: tx.id, status: tx.status });
        }
      });

      // Separate invoices into those that need new transactions vs updates
      const invoicesToCreate: typeof allInvoices = [];
      const transactionsToUpdate: { id: string; status: string }[] = [];

      (allInvoices || []).forEach(inv => {
        const existingTx = existingTxMap.get(inv.id);
        const newStatus = inv.status === "paid" ? "concluido" : "pendente";
        
        if (!existingTx) {
          // No transaction exists, create one
          invoicesToCreate.push(inv);
        } else if (existingTx.status !== newStatus) {
          // Transaction exists but status is different, update it
          transactionsToUpdate.push({ id: existingTx.id, status: newStatus });
        }
      });

      let created = 0;
      let updated = 0;

      // Create new transactions
      if (invoicesToCreate.length > 0) {
        const transactionsToInsert = invoicesToCreate.map(inv => ({
          name: inv.customer?.name
            ? `Invoice - ${inv.customer.name} (${inv.invoice_number})`
            : `Invoice ${inv.invoice_number}`,
          description: `Invoice ${inv.invoice_number}`,
          date: inv.issue_date || new Date().toISOString().split('T')[0],
          category: "Cleaning Revenue",
          status: inv.status === "paid" ? "concluido" : "pendente",
          amount: inv.total || 0,
          type: "receita",
          service_type: inv.job?.service_type || null,
          notes: `Invoice ID: ${inv.id}`,
        }));

        const { error: insertError } = await supabase
          .from("transactions")
          .insert(transactionsToInsert);

        if (insertError) throw insertError;
        created = transactionsToInsert.length;
      }

      // Update existing transactions with changed status and ensure category is correct
      for (const tx of transactionsToUpdate) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ status: tx.status, category: "Cleaning Revenue" })
          .eq("id", tx.id);

        if (updateError) {
          console.error("Error updating transaction:", updateError);
        } else {
          updated++;
        }
      }

      return { created, updated };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Silent sync - no toast notifications
    },
    onError: (error) => {
      console.error("Error syncing invoices to transactions:", error);
      // Silent error - don't show toast for background sync
    },
  });
}

// Get invoice statistics
export function useInvoiceStats() {
  return useQuery({
    queryKey: ["invoices", "stats"],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("id, status, total, due_date");

      if (error) throw error;

      const now = new Date();
      const stats = {
        sent: 0,
        sentTotal: 0,
        viewed: 0,
        viewedTotal: 0,
        paid: 0,
        paidTotal: 0,
        overdue: 0,
        overdueTotal: 0,
      };

      for (const inv of invoices || []) {
        const total = inv.total || 0;
        
        if (inv.status === "paid") {
          stats.paid++;
          stats.paidTotal += total;
        } else if (inv.status === "viewed") {
          stats.viewed++;
          stats.viewedTotal += total;
        } else if (inv.status === "overdue" || (inv.due_date && new Date(inv.due_date) < now && inv.status !== "paid")) {
          stats.overdue++;
          stats.overdueTotal += total;
        } else if (inv.status === "sent") {
          stats.sent++;
          stats.sentTotal += total;
        }
      }

      return stats;
    },
  });
}
