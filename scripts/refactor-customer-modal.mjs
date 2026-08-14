import fs from "node:fs";

const file = "apps/web/src/modules/crm/customers/components/CustomerModal.tsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace(
  'import { Customer, CustomerAddress, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";',
  'import { Customer, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";',
);
source = source.replace('import { FREQUENCY_OPTIONS } from "@/lib/serviceEnums";\n', '');

const importAnchor = 'import { useCustomerRelationships, useCreateRelationship, useEndRelationship } from "@/hooks/useCustomerRelationships";';
if (!source.includes(importAnchor)) throw new Error("Customer relationship import anchor missing");
source = source.replace(
  importAnchor,
  `${importAnchor}\nimport { CUSTOMER_DAYS_OF_WEEK, CUSTOMER_FREQUENCY_OPTIONS, CUSTOMER_PAYMENT_METHODS } from "../constants/customerFormOptions";\nimport { buildCustomerFormData, createEmptyCustomerFormState, createEmptyFormAddress, mapCustomerAddresses, mapCustomerToFormState } from "../utils/customerFormState";\nimport type { FormAddress } from "../utils/customerFormState";`,
);

const configStart = source.indexOf('// Use centralized frequency options from serviceEnums');
const componentStart = source.indexOf('export function CustomerModal', configStart);
if (configStart < 0 || componentStart < 0) throw new Error('Customer inline config block missing');
source = source.slice(0, configStart) + source.slice(componentStart);

const stateStart = source.indexOf('  const [formData, setFormData] = useState({');
const effectMarker = source.indexOf('  // Sync form data when customer changes or modal opens', stateStart);
if (stateStart < 0 || effectMarker < 0) throw new Error('Customer form state block missing');
source = source.slice(0, stateStart) + `  const [formData, setFormData] = useState(createEmptyCustomerFormState);\n  const [addresses, setAddresses] = useState<FormAddress[]>(() => [createEmptyFormAddress()]);\n\n` + source.slice(effectMarker);

const effectStart = source.indexOf('  // Sync form data when customer changes or modal opens');
const effectEndMarker = '  }, [open, customer, mode]);';
const effectEnd = source.indexOf(effectEndMarker, effectStart);
if (effectStart < 0 || effectEnd < 0) throw new Error('Customer hydration effect missing');
const effectReplacement = `  // Sync form data when customer changes or modal opens\n  useEffect(() => {\n    if (!open) return;\n\n    if (mode === "edit" && customer) {\n      const nextFormData = mapCustomerToFormState(customer);\n      setOriginalStatus(nextFormData.status);\n      setFormData(nextFormData);\n      setAddresses(mapCustomerAddresses(customer));\n      return;\n    }\n\n    if (mode === "create") {\n      setOriginalStatus(null);\n      setFormData(createEmptyCustomerFormState());\n      setAddresses([createEmptyFormAddress()]);\n    }\n  }, [open, customer, mode]);`;
source = source.slice(0, effectStart) + effectReplacement + source.slice(effectEnd + effectEndMarker.length);

const submitStart = source.indexOf('  const handleSubmit = () => {');
const modeBranch = source.indexOf('    if (mode === "create") {', submitStart);
if (submitStart < 0 || modeBranch < 0) throw new Error('Customer submit payload block missing');
const submitPrefix = `  const handleSubmit = () => {\n    const customerFormData = buildCustomerFormData(formData, addresses);\n\n`;
source = source.slice(0, submitStart) + submitPrefix + source.slice(modeBranch);

source = source.replace(
  '    setAddresses([...addresses, { id: newId, name: "", street: "", complement: "", city: "", state: "", postal_code: "", notes: "", additional_notes: "", frequency: "weekly", preferred_day: "monday" }]);',
  '    setAddresses([...addresses, { ...createEmptyFormAddress(newId), name: "" }]);',
);

source = source.replaceAll('frequencyOptionsKeys', 'CUSTOMER_FREQUENCY_OPTIONS');
source = source.replaceAll('paymentMethods', 'CUSTOMER_PAYMENT_METHODS');
source = source.replaceAll('daysOfWeekKeys', 'CUSTOMER_DAYS_OF_WEEK');

if (source.includes('FREQUENCY_OPTIONS')) throw new Error('Inline frequency dependency remains in CustomerModal');
if (source.includes('const paymentMethods')) throw new Error('Inline payment methods remain in CustomerModal');
if (source.includes('interface FormAddress')) throw new Error('Inline FormAddress remains in CustomerModal');
if (!source.includes('buildCustomerFormData(formData, addresses)')) throw new Error('Customer payload helper is not wired');
if (!source.includes('mapCustomerToFormState(customer)')) throw new Error('Customer hydration helper is not wired');

fs.writeFileSync(file, source);
