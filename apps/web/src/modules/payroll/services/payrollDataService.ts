import { supabase } from "@/integrations/supabase/client";

export async function fetchPayrollRecordsForPeriod(periodStart: string, periodEnd: string) {
  const { data, error } = await supabase
    .from("payroll_records")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);
  if (error) throw error;
  return data ?? [];
}

export async function fetchExistingPayrollRecordKeys(periodStart: string, periodEnd: string) {
  const { data, error } = await supabase
    .from("payroll_records")
    .select("id, staff_id, notes")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);
  if (error) throw error;
  return data ?? [];
}

export async function updatePayrollRecordValues(
  recordId: string,
  values: { base_value: number; bonus: number; total: number },
) {
  const { error } = await supabase.from("payroll_records").update(values).eq("id", recordId);
  if (error) throw error;
}

export async function sendPayrollStatementSms(input: {
  companyId: string | undefined;
  phone: string;
  message: string;
  fileName: string;
  pdfBlob: Blob;
}) {
  const { error: uploadError } = await supabase.storage
    .from("broadcast-attachments")
    .upload(input.fileName, input.pdfBlob, { contentType: "application/pdf" });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("broadcast-attachments").getPublicUrl(input.fileName);
  const { data, error } = await supabase.functions.invoke("send-sms-message", {
    body: {
      company_id: input.companyId,
      to_phone: input.phone,
      message: input.message,
      attachment_url: urlData.publicUrl,
    },
  });
  if (error || !data?.success) {
    throw error || new Error(data?.error || "Failed to send payroll statement");
  }
  return data;
}
