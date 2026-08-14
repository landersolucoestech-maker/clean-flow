import fs from "node:fs";

const file = "apps/web/src/modules/payroll/PayrollPage.tsx";
let src = fs.readFileSync(file, "utf8");

const oldUtilsImport = 'import { buildPayrollListRows, sortPayrollRecords } from "./utils/payrollView";';
if (src.includes(oldUtilsImport)) {
  src = src.replace(
    oldUtilsImport,
    'import { buildPayrollListRows, isCompletedJobStatus, isUuid, normalizePayrollName, sortPayrollRecords } from "./utils/payrollView";\nimport { fetchExistingPayrollRecordKeys, fetchPayrollRecordsForPeriod, sendPayrollStatementSms, updatePayrollRecordValues } from "./services/payrollDataService";',
  );
}

function replaceRange(startMarker, endMarker, replacement, required = true) {
  const start = src.indexOf(startMarker);
  if (start < 0) {
    if (required) throw new Error(`Missing start marker: ${startMarker.slice(0, 80)}`);
    return;
  }
  const end = src.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker.slice(0, 80)}`);
  src = src.slice(0, start) + replacement + src.slice(end);
}

replaceRange(
  "      // Fetch fresh records directly from database to ensure we have latest data",
  "      // If there are no records yet, auto-generate them from finished jobs for this period",
  "      let freshRecords = await fetchPayrollRecordsForPeriod(periodStartISO, periodEndISO);\n\n",
  false,
);

replaceRange(
  "        const refetch = await supabase",
  "      }\n\n      if (!freshRecords || freshRecords.length === 0)",
  "        freshRecords = await fetchPayrollRecordsForPeriod(periodStartISO, periodEndISO);\n",
  false,
);

src = src.replace(/\s+const normalizeName = \(value: string\) =>\n\s+value\n\s+\.normalize\("NFKD"\)\n\s+\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\n\s+\.toLowerCase\(\)\n\s+\.replace\(\/\[\^a-z0-9 \]\+\/g, " "\)\n\s+\.replace\(\/\\s\+\/g, " "\)\n\s+\.trim\(\);\n/g, "\n");
src = src.replaceAll("normalizeName(", "normalizePayrollName(");

const updateStart = src.indexOf('          const { error } = await supabase\n            .from("payroll_records")\n            .update({');
if (updateStart >= 0) {
  const updateEnd = src.indexOf("          updatedCount++;", updateStart);
  if (updateEnd < 0) throw new Error("Payroll update end missing");
  src = src.slice(0, updateStart) + `          await updatePayrollRecordValues(record.id, {
            base_value: unitValue,
            bonus: bonusForThisRecord,
            total: newTotal,
          });

` + src.slice(updateEnd);
}

src = src.replace(/\s+const isUuid = \(value: string\) =>\n\s+\/\^\[0-9a-f\].*?\.test\(value\);\n/s, "\n");

const completedStart = src.indexOf("    const isCompletedJob = (status: string | null) => {");
if (completedStart >= 0) {
  const completedEnd = src.indexOf("    setIsGeneratingFromJobs(true);", completedStart);
  if (completedEnd < 0) throw new Error("Completed job helper end missing");
  src = src.slice(0, completedStart) + src.slice(completedEnd);
}
src = src.replaceAll("isCompletedJob(", "isCompletedJobStatus(");

replaceRange(
  "      // Fetch existing records for this period (fresh) to avoid duplicates and allow re-runs safely",
  "      const existingKeys = new Set<string>(",
  "      const existingPeriodRecords = await fetchExistingPayrollRecordKeys(periodStartISO, periodEndISO);\n\n",
  false,
);
src = src.replace("(existingPeriodRecords || [])", "existingPeriodRecords");

function replaceSmsSection(handlerMarker, toastMarker, replacement) {
  const handler = src.indexOf(handlerMarker);
  if (handler < 0) throw new Error(`Handler missing: ${handlerMarker}`);
  const upload = src.indexOf("      // Upload to Supabase storage", handler);
  if (upload < 0) throw new Error(`Upload block missing: ${handlerMarker}`);
  const toast = src.indexOf(toastMarker, upload);
  if (toast < 0) throw new Error(`Toast marker missing: ${handlerMarker}`);
  src = src.slice(0, upload) + replacement + src.slice(toast);
}

replaceSmsSection(
  "  const handleSendFromPreview = async () => {",
  '      toast({\n        title: "SMS Sent",',
  `      const fileName = \`payroll/\${previewRecord.id}_\${Date.now()}_payroll_\${previewRecord.employeeName.replace(/\\s+/g, "_")}.pdf\`;
      await sendPayrollStatementSms({
        companyId: companySettings?.id,
        phone: staffMember.phone,
        message: \`Hi \${previewRecord.employeeName}, here is your payroll statement for \${previewRecord.period}. Total: \${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}\`,
        fileName,
        pdfBlob: previewPdfBlob,
      });

`,
);

replaceSmsSection(
  "  const handleSendPDFViaSMS = async (record: PayrollListRow) => {",
  '      toast({\n        title: "SMS Sent",',
  `      const fileName = \`payroll/\${record.id}_\${Date.now()}_payroll_\${record.employeeName.replace(/\\s+/g, "_")}.pdf\`;
      await sendPayrollStatementSms({
        companyId: companySettings?.id,
        phone: staffMember.phone,
        message: \`Hi \${record.employeeName}, here is your payroll statement for \${record.period}. Total: \${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}\`,
        fileName,
        pdfBlob,
      });

`,
);

const bulkHandler = src.indexOf("  const handleBulkSendPDFViaSMS = async () => {");
if (bulkHandler < 0) throw new Error("Bulk SMS handler missing");
const bulkUpload = src.indexOf("          // Upload to Supabase storage", bulkHandler);
if (bulkUpload < 0) throw new Error("Bulk upload block missing");
const bulkSuccess = src.indexOf("          successCount++;", bulkUpload);
if (bulkSuccess < 0) throw new Error("Bulk success marker missing");
src = src.slice(0, bulkUpload) + `          const fileName = \`payroll/\${Date.now()}_payroll_\${employeeName.replace(/\\s+/g, "_")}.pdf\`;
          await sendPayrollStatementSms({
            companyId: companySettings?.id,
            phone: staffMember.phone,
            message: \`Hi \${employeeName}, here is your payroll statement for \${period}. Total: \${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}\`,
            fileName,
            pdfBlob,
          });

` + src.slice(bulkSuccess);

src = src.replace('import { supabase } from "@/integrations/supabase/client";\n', "");

if (/\bsupabase\./.test(src)) throw new Error("Direct Supabase access remains in PayrollPage");
if (/ringcentral-send-message/.test(src)) throw new Error("Direct RingCentral call remains in PayrollPage");
if (!src.includes("sendPayrollStatementSms")) throw new Error("Payroll SMS service is not wired");

fs.writeFileSync(file, src);
