import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceBalanceInfo {
  totalContractValue: number;
  paidAmount: number;
  pendingAmount: number;
  remainingBalance: number;
  depositPaid: boolean;
  balancePaid: boolean;
  hasDeposit: boolean;
  hasBalance: boolean;
}

// Calculate the remaining balance for a lead/job
export function useLeadInvoiceBalance(leadId: string | null) {
  return useQuery({
    queryKey: ["lead-invoice-balance", leadId],
    queryFn: async (): Promise<InvoiceBalanceInfo | null> => {
      if (!leadId) return null;

      // Get lead total value
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("total, agreed_amount")
        .eq("id", leadId)
        .single();

      if (leadError || !lead) return null;

      const totalContractValue = lead.total || lead.agreed_amount || 0;

      // Get all invoices for this lead
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, total, status, invoice_type, amount_paid")
        .eq("lead_id", leadId);

      if (invoicesError) return null;

      let paidAmount = 0;
      let pendingAmount = 0;
      let hasDeposit = false;
      let hasBalance = false;
      let depositPaid = false;
      let balancePaid = false;

      invoices?.forEach((invoice) => {
        const invoiceTotal = invoice.total || 0;
        const invoicePaid = invoice.amount_paid || (invoice.status === "paid" ? invoiceTotal : 0);

        if (invoice.invoice_type === "deposit") {
          hasDeposit = true;
          if (invoice.status === "paid") {
            depositPaid = true;
            paidAmount += invoiceTotal;
          } else {
            pendingAmount += invoiceTotal;
          }
        } else if (invoice.invoice_type === "balance") {
          hasBalance = true;
          if (invoice.status === "paid") {
            balancePaid = true;
            paidAmount += invoiceTotal;
          } else {
            pendingAmount += invoiceTotal;
          }
        } else {
          // Standard invoice
          if (invoice.status === "paid") {
            paidAmount += invoiceTotal;
          } else {
            pendingAmount += invoiceTotal;
          }
        }
      });

      const remainingBalance = Math.max(0, totalContractValue - paidAmount);

      return {
        totalContractValue,
        paidAmount,
        pendingAmount,
        remainingBalance,
        depositPaid,
        balancePaid,
        hasDeposit,
        hasBalance,
      };
    },
    enabled: !!leadId,
  });
}

// Calculate balance for job (using job_id)
export function useJobInvoiceBalance(jobId: string | null) {
  return useQuery({
    queryKey: ["job-invoice-balance", jobId],
    queryFn: async (): Promise<InvoiceBalanceInfo | null> => {
      if (!jobId) return null;

      // Get job details including lead_id and amount
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("id, amount, lead_id")
        .eq("id", jobId)
        .single();

      if (jobError || !job) return null;

      // If job has a lead, get lead total value
      let totalContractValue = job.amount || 0;
      const leadId = job.lead_id;

      if (leadId) {
        const { data: lead } = await supabase
          .from("leads")
          .select("total, agreed_amount")
          .eq("id", leadId)
          .single();

        if (lead) {
          totalContractValue = lead.total || lead.agreed_amount || totalContractValue;
        }
      }

      // Get all paid invoices for this job or lead
      const query = supabase
        .from("invoices")
        .select("id, total, status, invoice_type, amount_paid");

      if (leadId) {
        query.or(`job_id.eq.${jobId},lead_id.eq.${leadId}`);
      } else {
        query.eq("job_id", jobId);
      }

      const { data: invoices, error: invoicesError } = await query;

      if (invoicesError) return null;

      let paidAmount = 0;
      let pendingAmount = 0;
      let hasDeposit = false;
      let hasBalance = false;
      let depositPaid = false;
      let balancePaid = false;

      invoices?.forEach((invoice) => {
        const invoiceTotal = invoice.total || 0;

        if (invoice.invoice_type === "deposit") {
          hasDeposit = true;
          if (invoice.status === "paid") {
            depositPaid = true;
            paidAmount += invoiceTotal;
          } else {
            pendingAmount += invoiceTotal;
          }
        } else if (invoice.invoice_type === "balance") {
          hasBalance = true;
          if (invoice.status === "paid") {
            balancePaid = true;
            paidAmount += invoiceTotal;
          } else {
            pendingAmount += invoiceTotal;
          }
        } else {
          if (invoice.status === "paid") {
            paidAmount += invoiceTotal;
          } else {
            pendingAmount += invoiceTotal;
          }
        }
      });

      const remainingBalance = Math.max(0, totalContractValue - paidAmount);

      return {
        totalContractValue,
        paidAmount,
        pendingAmount,
        remainingBalance,
        depositPaid,
        balancePaid,
        hasDeposit,
        hasBalance,
      };
    },
    enabled: !!jobId,
  });
}

// Helper function to calculate remaining balance (for use in edge functions or server-side)
export async function calculateRemainingBalance(
  supabaseClient: typeof supabase,
  leadId: string | null,
  jobId: string | null
): Promise<{ totalContractValue: number; paidAmount: number; remainingBalance: number }> {
  let totalContractValue = 0;

  // Get total contract value from lead or job
  if (leadId) {
    const { data: lead } = await supabaseClient
      .from("leads")
      .select("total, agreed_amount")
      .eq("id", leadId)
      .single();

    if (lead) {
      totalContractValue = lead.total || lead.agreed_amount || 0;
    }
  }

  if (!totalContractValue && jobId) {
    const { data: job } = await supabaseClient
      .from("jobs")
      .select("amount")
      .eq("id", jobId)
      .single();

    if (job) {
      totalContractValue = job.amount || 0;
    }
  }

  // Get all paid invoices
  let paidAmount = 0;

  const query = supabaseClient
    .from("invoices")
    .select("total, status, amount_paid")
    .eq("status", "paid");

  if (leadId && jobId) {
    query.or(`lead_id.eq.${leadId},job_id.eq.${jobId}`);
  } else if (leadId) {
    query.eq("lead_id", leadId);
  } else if (jobId) {
    query.eq("job_id", jobId);
  }

  const { data: invoices } = await query;

  invoices?.forEach((invoice) => {
    paidAmount += invoice.total || invoice.amount_paid || 0;
  });

  const remainingBalance = Math.max(0, totalContractValue - paidAmount);

  return { totalContractValue, paidAmount, remainingBalance };
}
