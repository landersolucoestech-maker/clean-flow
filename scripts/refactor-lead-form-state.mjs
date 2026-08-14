import fs from "node:fs";

const files = [
  {
    path: "apps/web/src/modules/crm/leads/components/CreateLeadModal.tsx",
    includeReset: true,
  },
  {
    path: "apps/web/src/modules/crm/leads/components/EditLeadModal.tsx",
    includeReset: false,
  },
];

for (const { path, includeReset } of files) {
  let source = fs.readFileSync(path, "utf8");

  const importAnchor = 'import type { LeadAddressEntry, LeadInteractionEntry } from "../types/leadForm";';
  if (!source.includes(importAnchor)) throw new Error(`${path}: lead form type import missing`);
  source = source.replace(
    importAnchor,
    `${importAnchor}\nimport { useLeadFormState } from "../hooks/useLeadFormState";`,
  );

  const stateStart = source.indexOf("  const [formData, setFormData] = useState(");
  const stateEndMarker = "  const [expandedAddOns, setExpandedAddOns] = useState<Record<string, boolean>>({});";
  const stateEndStart = source.indexOf(stateEndMarker, stateStart);
  if (stateStart < 0 || stateEndStart < 0) throw new Error(`${path}: lead state block not found`);
  const stateEnd = stateEndStart + stateEndMarker.length;

  const fields = [
    "formData",
    "setFormData",
    "addresses",
    "setAddresses",
    "interactions",
    "setInteractions",
    "expandedAreas",
    "setExpandedAreas",
    "expandedAddOns",
    "setExpandedAddOns",
    ...(includeReset ? ["resetLeadFormState"] : []),
  ];

  const replacement = `  const {\n${fields.map((field) => `    ${field},`).join("\n")}\n  } = useLeadFormState();`;
  source = source.slice(0, stateStart) + replacement + source.slice(stateEnd);

  if (includeReset) {
    const resetStart = source.indexOf("  const resetForm = () => {");
    const nextStart = source.indexOf("  const addAddress = () => {", resetStart);
    if (resetStart < 0 || nextStart < 0) throw new Error(`${path}: resetForm block not found`);
    source =
      source.slice(0, resetStart) +
      '  const resetForm = () => {\n    resetLeadFormState();\n    setNewTag("");\n  };\n\n' +
      source.slice(nextStart);
  }

  if (source.includes("const [formData, setFormData] = useState(")) {
    throw new Error(`${path}: inline lead form state remains`);
  }

  fs.writeFileSync(path, source);
}
