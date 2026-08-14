import fs from "node:fs";

const file = "apps/web/src/modules/crm/leads/pages/LeadsPageContent.tsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace('import { supabase } from "@/integrations/supabase/client";\n', "");
source = source.replace('import type { TablesInsert } from "@/integrations/supabase/types";\n', "");
const importAnchor = 'import { formatDateByLanguage } from "@/hooks/useCompanyLanguage";';
if (!source.includes(importAnchor)) throw new Error("Leads page import anchor missing");
source = source.replace(importAnchor, `${importAnchor}\nimport { fetchJobsForLeadIds, fetchLeadInvoices } from "../services/leadsPageQueries";\nimport { syncLeadAddresses } from "../services/leadAddressSync";`);

const invoiceStart = source.indexOf('  const { data: invoicesData = [] } = useQuery({');
const invoiceEnd = source.indexOf('  // Create a map of lead_id to invoice status using invoice_type field', invoiceStart);
if (invoiceStart < 0 || invoiceEnd < 0) throw new Error("Invoice query block not found");
source = source.slice(0, invoiceStart) + '  const { data: invoicesData = [] } = useQuery({\n    queryKey: ["invoices-for-leads"],\n    queryFn: fetchLeadInvoices,\n  });\n\n' + source.slice(invoiceEnd);

const jobsStart = source.indexOf('  const { data: jobsForLeads = [] } = useQuery({');
const jobsEnd = source.indexOf('  const jobsByLeadId = useMemo(() => {', jobsStart);
if (jobsStart < 0 || jobsEnd < 0) throw new Error("Jobs query block not found");
source = source.slice(0, jobsStart) + '  const { data: jobsForLeads = [] } = useQuery({\n    queryKey: ["jobs-for-leads", leadDbIds],\n    queryFn: () => fetchJobsForLeadIds(leadDbIds),\n    enabled: leadDbIds.length > 0,\n  });\n\n' + source.slice(jobsEnd);

const syncComment = '      // Upsert lead_addresses (street/city/state/zip) based on the EditLeadModal form';
const syncStart = source.indexOf(syncComment);
const invalidateStart = source.indexOf('      await queryClient.invalidateQueries({ queryKey: ["leads"] });', syncStart);
if (syncStart < 0 || invalidateStart < 0) throw new Error("Lead address sync block not found");
source = source.slice(0, syncStart) + '      await syncLeadAddresses(dbId, updatedEstimate.addresses || []);\n\n' + source.slice(invalidateStart);

source = source.replace('      console.error("Error saving estimate:", error);\n      toast.error("Erro ao salvar alterações");', '      toast.error(error instanceof Error ? error.message : "Erro ao salvar alterações");');

if (source.includes("supabase.") || source.includes('from "@/integrations/supabase')) {
  throw new Error("Direct Supabase access remains in LeadsPageContent");
}
fs.writeFileSync(file, source);
