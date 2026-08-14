import fs from "node:fs";

const file = "apps/web/src/modules/payroll/PayrollPage.tsx";
let source = fs.readFileSync(file, "utf8");

const utilsImport = 'import { buildPayrollListRows, isCompletedJobStatus, isUuid, normalizePayrollName, sortPayrollRecords } from "./utils/payrollView";';
if (!source.includes(utilsImport)) throw new Error("payrollView import anchor missing");
source = source.replace(
  utilsImport,
  `${utilsImport}\nimport { buildStaffBaseValueMap, buildStaffPaymentMethodMap, mapPayrollRecords } from "./utils/payrollData";`,
);

const start = source.indexOf("  // Map staff_id -> base_value from payroll rules");
const end = source.indexOf("  // Filtered data state", start);
if (start < 0 || end < 0) throw new Error("Payroll data preparation block not found");

const replacement = `  const staffBaseValueMap = useMemo(() => buildStaffBaseValueMap(payrollRules), [payrollRules]);\n\n  const staffPaymentMethodMap = useMemo(\n    () => buildStaffPaymentMethodMap(staffList),\n    [staffList],\n  );\n\n  const payrollData: PayrollRecord[] = useMemo(\n    () => mapPayrollRecords(dbPayrollRecords, staffPaymentMethodMap),\n    [dbPayrollRecords, staffPaymentMethodMap],\n  );\n\n`;
source = source.slice(0, start) + replacement + source.slice(end);

if (source.includes("// Map staff_id -> base_value from payroll rules")) throw new Error("Old payroll data preparation block remains");
if (!source.includes("mapPayrollRecords(dbPayrollRecords")) throw new Error("Payroll mapper not wired");
fs.writeFileSync(file, source);
