import fs from "node:fs";

const file = "apps/web/src/modules/crm/leads/components/CreateLeadModal.tsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace('import { supabase } from "@/integrations/supabase/client";\n', '');
source = source.replace('import { generateLeadNumber } from "@/hooks/useLeads";\n', '');

const anchor = 'import { formatLeadCurrency } from "../utils/leadForm";';
if (!source.includes(anchor)) throw new Error('CreateLead import anchor missing');
source = source.replace(anchor, `${anchor}\nimport { createLeadWithRelations } from "../services/leadCreationService";`);

const handlerStart = source.indexOf('  const handleCreateLead = async () => {');
const returnStart = source.indexOf('  return (', handlerStart);
if (handlerStart < 0 || returnStart < 0) throw new Error('CreateLead handler block missing');

const replacement = `  const handleCreateLead = async () => {\n    if (isSaving || !validateForm()) return;\n\n    setIsSaving(true);\n    try {\n      await createLeadWithRelations(formData, addresses, interactions);\n      await Promise.all([\n        queryClient.invalidateQueries({ queryKey: ["leads"] }),\n        queryClient.invalidateQueries({ queryKey: ["customers"] }),\n      ]);\n\n      toast.success("Lead created successfully!");\n      onOpenChange(false);\n      resetForm();\n    } catch {\n      toast.error("Error saving lead");\n    } finally {\n      setIsSaving(false);\n    }\n  };\n\n`;
source = source.slice(0, handlerStart) + replacement + source.slice(returnStart);

if (/\bsupabase\./.test(source)) throw new Error('Direct Supabase access remains in CreateLeadModal');
if (source.includes('generateLeadNumber')) throw new Error('Lead number generation remains in CreateLeadModal');
if (/console\.(log|debug|trace|warn|error)\s*\(/.test(source)) throw new Error('Console logging remains in CreateLeadModal');
if (!source.includes('createLeadWithRelations(formData, addresses, interactions)')) throw new Error('Lead creation service not wired');

fs.writeFileSync(file, source);
