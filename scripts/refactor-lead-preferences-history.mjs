import fs from "node:fs";

const configs = [
  { path: "apps/web/src/modules/crm/leads/components/CreateLeadModal.tsx", interactionLabel: "LeadInteractionEntry" },
  { path: "apps/web/src/modules/crm/leads/components/EditLeadModal.tsx", interactionLabel: "Interaction" },
];

for (const config of configs) {
  let source = fs.readFileSync(config.path, "utf8");
  const importAnchor = 'import { useLeadFormState } from "../hooks/useLeadFormState";';
  if (!source.includes(importAnchor)) throw new Error(`${config.path}: form hook import missing`);
  source = source.replace(importAnchor, `${importAnchor}\nimport { LeadPreferencesHistorySections } from "./LeadPreferencesHistorySections";`);

  const start = source.indexOf("          {/* 7. Customer Preferences & Visit/Estimate */}");
  const footer = source.indexOf("        <DialogFooter", start);
  if (start < 0 || footer < 0) throw new Error(`${config.path}: sections 7-9 not found`);
  const replacement = `          <LeadPreferencesHistorySections\n            formData={formData}\n            setFormData={setFormData}\n            interactions={interactions}\n            isIntegrationLead={isIntegrationLead}\n            interactionLabel="${config.interactionLabel}"\n            togglePreferredDay={togglePreferredDay}\n            handleAmountBlur={handleAmountBlur}\n            addInteraction={addInteraction}\n            removeInteraction={removeInteraction}\n            updateInteraction={updateInteraction}\n          />\n        </div>\n\n`;
  source = source.slice(0, start) + replacement + source.slice(footer);
  if (source.includes("{/* 7. Customer Preferences")) throw new Error(`${config.path}: inline preferences remain`);
  fs.writeFileSync(config.path, source);
}
