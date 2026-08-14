import { supabase } from "@/integrations/supabase/client";

interface CreateLeadDepositInvoiceInput {
  leadId: string;
  customerId: string;
  amount: string;
  service: string;
}

export async function createLeadDepositInvoice({
  leadId,
  customerId,
  amount,
  service,
}: CreateLeadDepositInvoiceInput) {
  const amountValue = parseFloat(amount.replace(/[^0-9.]/g, ""));
  const depositAmount = amountValue * 0.5;

  const { data: lastInvoice, error: lastInvoiceError } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1);

  if (lastInvoiceError) throw lastInvoiceError;

  let invoiceNumber = "INV-0001";
  if (lastInvoice && lastInvoice.length > 0) {
    const lastNumber = parseInt(lastInvoice[0].invoice_number.replace("INV-", ""));
    invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, "0")}`;
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: customerId,
      lead_id: leadId,
      status: "pending",
      total: depositAmount,
      subtotal: depositAmount,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: `Depósito 50% - ${service}`,
      auto_generated: true,
    })
    .select()
    .single();

  if (error) throw error;
  return invoice;
}
