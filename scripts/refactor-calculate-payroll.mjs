import fs from "node:fs";

const file = "apps/web/src/modules/payroll/components/CalculatePayrollModal.tsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace('import { useState, useMemo, useEffect, useCallback } from "react";', 'import { useState, useMemo, useEffect } from "react";');
source = source.replace('import { useStaff, Staff } from "@/hooks/useStaff";', 'import { useStaff } from "@/hooks/useStaff";');

const anchor = 'import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";';
if (!source.includes(anchor)) throw new Error('CalculatePayroll import anchor missing');
source = source.replace(
  anchor,
  `${anchor}\nimport { resolveAssignedPayrollStaff, shouldIncludePayrollJobStatus } from "../utils/payrollAssignment";`,
);

const helperStart = source.indexOf('  // Helper functions');
const calculationStart = source.indexOf('  // Calculate employee data from jobs (completed or all based on toggle)', helperStart);
if (helperStart < 0 || calculationStart < 0) throw new Error('CalculatePayroll assignment helper block missing');
source = source.slice(0, helperStart) + source.slice(calculationStart);

const statusStart = source.indexOf('    const isCompletedStatus = (status: string | null) => {');
const rulesStart = source.indexOf('    const rulesByStaffId = new Map<string, PayrollRule>();', statusStart);
if (statusStart < 0 || rulesStart < 0) throw new Error('CalculatePayroll status helper block missing');
source = source.slice(0, statusStart) + source.slice(rulesStart);

const oldStatusCheck = `      // Check if job should be included based on status\n      const isCompleted = isCompletedStatus(job.status);\n      const isInProgress = isScheduledOrInProgress(job.status);\n      \n      // If includeNonCompleted is true, include both completed and scheduled/in-progress jobs\n      // Otherwise, only include completed jobs\n      if (!includeNonCompleted && !isCompleted) return false;\n      if (includeNonCompleted && !isCompleted && !isInProgress) return false;\n\n`;
if (!source.includes(oldStatusCheck)) throw new Error('CalculatePayroll inline status check missing');
source = source.replace(oldStatusCheck, '      if (!shouldIncludePayrollJobStatus(job.status, includeNonCompleted)) return false;\n\n');
source = source.replaceAll('findStaffFromAssignedValue(assignedValue)', 'resolveAssignedPayrollStaff(assignedValue, staffList)');
source = source.replace(', findStaffFromAssignedValue]);', ']);');

if (/const\s+normalizeName\s*=/.test(source)) throw new Error('Inline normalizeName remains in CalculatePayrollModal');
if (/const\s+isUuid\s*=/.test(source)) throw new Error('Inline isUuid remains in CalculatePayrollModal');
if (/const\s+findStaffFromAssignedValue\s*=/.test(source) || /findStaffFromAssignedValue\s*\(assignedValue\)/.test(source)) throw new Error('Inline staff resolver remains in CalculatePayrollModal');
if (/const\s+isCompletedStatus\s*=/.test(source) || /isCompletedStatus\s*\(job\.status\)/.test(source)) throw new Error('Inline completed-status helper remains in CalculatePayrollModal');
if (source.includes(', findStaffFromAssignedValue])')) throw new Error('Obsolete payroll resolver hook dependency remains');
if (!source.includes('resolveAssignedPayrollStaff(assignedValue, staffList)')) throw new Error('Payroll assignment helper not wired');

fs.writeFileSync(file, source);
