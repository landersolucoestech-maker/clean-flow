import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuickBooks } from "./useQuickBooks";
import { useQuickBooksStore } from "@/stores/quickbooks.store";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface SyncResult {
  success: boolean;
  qbInvoiceId?: string;
  qbDocNumber?: string;
  error?: string;
}

export function useQuickBooksSync() {
  const { 
    isConnected, 
    createInvoice: createQBInvoice, 
    createCustomer: createQBCustomer,
    sendInvoice: sendQBInvoice
  } = useQuickBooks();
  
  const { 
    addSyncLog, 
    setLastSyncAt, 
    customerMapping, 
    setCustomerMapping,
    setInvoiceMapping
  } = useQuickBooksStore();

  // Sync a single invoice to QuickBooks
  const syncInvoiceToQuickBooks = useCallback(async (
    invoiceId: string,
    customerId: string,
    customerName: string,
    customerEmail: string | null,
    customerPhone: string | null,
    total: number,
    invoiceNumber: string,
    notes?: string
  ): Promise<SyncResult> => {
    if (!isConnected) {
      const error = "QuickBooks not connected";
      addSyncLog({
        type: "invoice",
        action: "sync",
        status: "error",
        message: error,
        localId: invoiceId,
      });
      toast.error(`QB Sync Failed: ${error}`, {
        description: `Invoice ${invoiceNumber} could not be synced.`,
        duration: 5000,
      });
      return { success: false, error };
    }

    try {
      // Check if customer exists in QuickBooks
      let qbCustomerId = customerMapping[customerId];
      
      if (!qbCustomerId) {
        // Try to find existing customer
        const { data: searchResult } = await supabase.functions.invoke("quickbooks-api", {
          body: {
            action: "search-customer",
            data: { displayName: customerName },
          },
        });

        if (searchResult?.Customer) {
          qbCustomerId = searchResult.Customer.Id;
          setCustomerMapping(customerId, qbCustomerId);
          addSyncLog({
            type: "customer",
            action: "sync",
            status: "success",
            message: `Found existing customer: ${customerName}`,
            localId: customerId,
            qbId: qbCustomerId,
          });
        } else {
          // Create new customer
          const newCustomer = await createQBCustomer({
            name: customerName,
            email: customerEmail || undefined,
            phone: customerPhone || undefined,
          });
          
          if (newCustomer?.Id) {
            qbCustomerId = newCustomer.Id;
            setCustomerMapping(customerId, qbCustomerId);
            addSyncLog({
              type: "customer",
              action: "create",
              status: "success",
              message: `Created customer: ${customerName}`,
              localId: customerId,
              qbId: qbCustomerId,
            });
          } else {
            throw new Error("Failed to create customer in QuickBooks");
          }
        }
      }

      // Create invoice in QuickBooks
      const qbInvoice = await createQBInvoice({
        customerId: qbCustomerId,
        lineItems: [{
          description: notes || `Invoice ${invoiceNumber}`,
          amount: total,
          quantity: 1,
          unitPrice: total,
        }],
        invoiceNumber,
        notes,
        email: customerEmail || undefined,
      });

      if (!qbInvoice?.Id) {
        throw new Error("Failed to create invoice in QuickBooks");
      }

      // Store mapping
      setInvoiceMapping(invoiceId, qbInvoice.Id);

      // Update local invoice with QB data
      await supabase
        .from("invoices")
        .update({
          qb_invoice_id: qbInvoice.Id,
          qb_doc_number: qbInvoice.DocNumber,
          qb_synced_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      // Send invoice via QuickBooks if email available
      if (customerEmail) {
        try {
          await sendQBInvoice(qbInvoice.Id, customerEmail);
          await supabase
            .from("invoices")
            .update({ qb_email_status: "EmailSent" })
            .eq("id", invoiceId);
            
          addSyncLog({
            type: "invoice",
            action: "send",
            status: "success",
            message: `Invoice ${invoiceNumber} sent to ${customerEmail}`,
            localId: invoiceId,
            qbId: qbInvoice.Id,
          });
        } catch (sendError) {
          console.error("Failed to send invoice email:", sendError);
          // Don't fail the whole sync if email fails
        }
      }

      addSyncLog({
        type: "invoice",
        action: "create",
        status: "success",
        message: `Invoice ${invoiceNumber} synced to QuickBooks`,
        localId: invoiceId,
        qbId: qbInvoice.Id,
      });

      setLastSyncAt(new Date());
      
      toast.success(`Invoice synced to QuickBooks`, {
        description: `Invoice ${invoiceNumber} created successfully.`,
      });

      return { 
        success: true, 
        qbInvoiceId: qbInvoice.Id, 
        qbDocNumber: qbInvoice.DocNumber 
      };

    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, "Unknown error");
      
      addSyncLog({
        type: "invoice",
        action: "sync",
        status: "error",
        message: `Failed to sync invoice ${invoiceNumber}: ${errorMessage}`,
        localId: invoiceId,
      });

      toast.error(`QuickBooks Sync Failed`, {
        description: errorMessage,
        duration: 8000,
        action: {
          label: "View Logs",
          onClick: () => window.location.href = "/sync-logs",
        },
      });

      return { success: false, error: errorMessage };
    }
  }, [isConnected, customerMapping, setCustomerMapping, setInvoiceMapping,
      createQBCustomer, createQBInvoice, sendQBInvoice, addSyncLog, setLastSyncAt]);

  // Auto-sync invoice when job is completed
  const syncJobCompletionInvoice = useCallback(async (jobId: string) => {
    if (!isConnected) {
      console.log("QuickBooks not connected, skipping auto-sync");
      return null;
    }

    try {
      // Get job with customer info
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*, customer:customers(*)")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error("Job not found");
      }

      // Check if invoice already exists for this job
      const { data: existingInvoice } = await supabase
        .from("invoices")
        .select("id, qb_invoice_id")
        .eq("job_id", jobId)
        .maybeSingle();

      if (existingInvoice?.qb_invoice_id) {
        console.log("Invoice already synced to QuickBooks");
        return existingInvoice;
      }

      // Create invoice if doesn't exist
      let invoiceId = existingInvoice?.id;
      let invoiceNumber: string;

      if (!invoiceId) {
        // Generate invoice number
        const { data: lastInvoice } = await supabase
          .from("invoices")
          .select("invoice_number")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastNumber = lastInvoice?.invoice_number 
          ? parseInt(lastInvoice.invoice_number.replace(/\D/g, "")) 
          : 0;
        invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, "0")}`;

        // Create local invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            customer_id: job.customer_id,
            job_id: jobId,
            invoice_number: invoiceNumber,
            total: job.amount || 0,
            subtotal: job.amount || 0,
            status: "sent",
            issue_date: new Date().toISOString().split("T")[0],
            due_date: new Date().toISOString().split("T")[0], // Due on receipt
            auto_generated: true,
            notes: job.title,
          })
          .select()
          .single();

        if (invoiceError || !newInvoice) {
          throw new Error("Failed to create invoice");
        }

        invoiceId = newInvoice.id;
        invoiceNumber = newInvoice.invoice_number;

        addSyncLog({
          type: "invoice",
          action: "create",
          status: "success",
          message: `Auto-generated invoice ${invoiceNumber} for completed job`,
          localId: invoiceId,
        });
      } else {
        // Get existing invoice number
        const { data: invoice } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("id", invoiceId)
          .single();
        invoiceNumber = invoice?.invoice_number || "UNKNOWN";
      }

      // Sync to QuickBooks
      const result = await syncInvoiceToQuickBooks(
        invoiceId,
        job.customer_id,
        job.customer?.name || "Unknown Customer",
        job.customer?.email || null,
        job.customer?.phone || null,
        job.amount || 0,
        invoiceNumber,
        job.title
      );

      return result;

    } catch (error: unknown) {
      console.error("Auto-sync failed:", error);
      
      addSyncLog({
        type: "invoice",
        action: "sync",
        status: "error",
        message: `Auto-sync failed for job ${jobId}: ${getErrorMessage(error, "Unknown error")}`,
        localId: jobId,
      });

      toast.error("Auto-sync to QuickBooks Failed", {
        description: getErrorMessage(error, "Unknown error"),
        duration: 8000,
        action: {
          label: "View Logs",
          onClick: () => window.location.href = "/sync-logs",
        },
      });

      return null;
    }
  }, [isConnected, addSyncLog, syncInvoiceToQuickBooks]);

  // Retry a failed sync operation
  const retrySyncOperation = useCallback(async (
    logId: string,
    type: "invoice" | "customer" | "payment" | "payroll",
    action: string,
    localId?: string
  ): Promise<boolean> => {
    if (!localId) {
      toast.error("Cannot retry: No local ID available");
      return false;
    }

    toast.info("Retrying sync operation...");

    try {
      if (type === "invoice") {
        // Get invoice data
        const { data: invoice, error } = await supabase
          .from("invoices")
          .select("*, customer:customers(*)")
          .eq("id", localId)
          .single();

        if (error || !invoice) {
          throw new Error("Invoice not found");
        }

        const result = await syncInvoiceToQuickBooks(
          invoice.id,
          invoice.customer_id,
          invoice.customer?.name || "Unknown",
          invoice.customer?.email || null,
          invoice.customer?.phone || null,
          invoice.total || 0,
          invoice.invoice_number,
          invoice.notes || undefined
        );

        return result.success;
      }

      if (type === "customer") {
        // Get customer data
        const { data: customer, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", localId)
          .single();

        if (error || !customer) {
          throw new Error("Customer not found");
        }

        const newCustomer = await createQBCustomer({
          name: customer.name,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          address: customer.address || undefined,
          city: customer.city || undefined,
          state: customer.state || undefined,
          zip: customer.zip_code || undefined,
        });

        if (newCustomer?.Id) {
          setCustomerMapping(localId, newCustomer.Id);
          addSyncLog({
            type: "customer",
            action: "create",
            status: "success",
            message: `Retry successful: Customer ${customer.name} synced`,
            localId,
            qbId: newCustomer.Id,
          });
          setLastSyncAt(new Date());
          toast.success("Customer synced successfully");
          return true;
        }

        throw new Error("Failed to create customer");
      }

      toast.warning("Retry not supported for this operation type");
      return false;

    } catch (error: unknown) {
      addSyncLog({
        type,
        action: "sync",
        status: "error",
        message: `Retry failed: ${getErrorMessage(error, "Unknown error")}`,
        localId,
      });

      toast.error("Retry Failed", {
        description: getErrorMessage(error, "Unknown error"),
        duration: 5000,
      });

      return false;
    }
  }, [syncInvoiceToQuickBooks, createQBCustomer, setCustomerMapping, addSyncLog, setLastSyncAt]);

  return {
    syncInvoiceToQuickBooks,
    syncJobCompletionInvoice,
    retrySyncOperation,
    isConnected,
  };
}
