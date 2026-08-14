import fs from "node:fs";

const file = "apps/web/src/modules/crm/leads/components/LeadDetailsModal.tsx";
let source = fs.readFileSync(file, "utf8");

const supabaseImport = 'import { supabase } from "@/integrations/supabase/client";\n';
if (!source.includes(supabaseImport)) throw new Error("Supabase import anchor missing");
source = source.replace(supabaseImport, "");

const hookImport = 'import { useCreateLeadInteraction, INTERACTION_TYPES } from "@/hooks/useLeads";';
if (!source.includes(hookImport)) throw new Error("Lead hook import anchor missing");
source = source.replace(
  hookImport,
  `${hookImport}\nimport { LEAD_ROOM_SERVICES } from "../constants/leadRoomServices";\nimport { createLeadDepositInvoice } from "../services/leadDepositInvoiceService";`,
);

const roomStart = source.indexOf("const ROOM_SERVICES = {");
const roomEndMarker = "} as const;";
const roomEnd = source.indexOf(roomEndMarker, roomStart);
if (roomStart < 0 || roomEnd < 0) throw new Error("Room services block not found");
source = source.slice(0, roomStart) + source.slice(roomEnd + roomEndMarker.length + 1);
source = source.replaceAll("ROOM_SERVICES", "LEAD_ROOM_SERVICES");

const depositStart = source.indexOf("  // Generate 50% deposit invoice automatically");
const approveStart = source.indexOf("  const handleApprove = async () => {", depositStart);
if (depositStart < 0 || approveStart < 0) throw new Error("Deposit invoice block not found");
const depositReplacement = `  const generateDepositInvoice = async () => {\n    if (!estimate._dbId || !estimate._customerId) return null;\n    return createLeadDepositInvoice({\n      leadId: estimate._dbId,\n      customerId: estimate._customerId,\n      amount: estimate.amount,\n      service: estimate.service,\n    });\n  };\n\n`;
source = source.slice(0, depositStart) + depositReplacement + source.slice(approveStart);

if (source.includes('from("invoices")')) throw new Error("Invoice data access remains in LeadDetailsModal");
if (source.includes("const ROOM_SERVICES")) throw new Error("Room catalog remains in LeadDetailsModal");
if (!source.includes("createLeadDepositInvoice")) throw new Error("Deposit invoice service not wired");
fs.writeFileSync(file, source);
