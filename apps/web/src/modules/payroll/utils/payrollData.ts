import { format } from "date-fns";
import type { PayrollRecord } from "../types/payrollView";

interface PayrollRuleLike {
  staff_id: string;
  base_value: number;
}

interface StaffLike {
  id: string;
  payment_method?: string | null;
}

interface DbPayrollRecordLike {
  id: string;
  notes?: string | null;
  staff_id?: string | null;
  base_value?: number | string | null;
  payment_type: string;
  period_start: string;
  period_end: string;
  employee_name: string;
  cleaning_type?: string | null;
  client?: string | null;
  bonus?: number | string | null;
  status: PayrollRecord["status"];
}

export function buildStaffBaseValueMap(rules: PayrollRuleLike[]) {
  const map = new Map<string, number>();
  rules.forEach((rule) => map.set(rule.staff_id, rule.base_value));
  return map;
}

export function buildStaffPaymentMethodMap(staffList: StaffLike[]) {
  const map = new Map<string, string>();
  staffList.forEach((staff) => {
    if (staff.payment_method) map.set(staff.id, staff.payment_method);
  });
  return map;
}

export function mapPayrollRecords(
  records: DbPayrollRecordLike[],
  staffPaymentMethodMap: Map<string, string>,
): PayrollRecord[] {
  return records.map((record) => {
    const match = record.notes?.match(/^Job\s+([a-f0-9]+)/i);
    const jobIdShort = match ? match[1].toLowerCase() : null;
    const staffId = record.staff_id ?? null;
    const unitValue = Number(record.base_value) || 0;
    const paymentMethod = staffId
      ? staffPaymentMethodMap.get(staffId) || record.payment_type
      : record.payment_type;

    return {
      id: record.id,
      periodStartISO: record.period_start,
      periodEndISO: record.period_end,
      period: `${format(new Date(record.period_start), "MM/dd/yyyy")} - ${format(new Date(record.period_end), "MM/dd/yyyy")}`,
      employeeName: record.employee_name,
      staffId,
      cleaningType: record.cleaning_type || "General Cleaning",
      client: record.client || "N/A",
      baseValue: unitValue,
      bonus: Number(record.bonus) || 0,
      paymentType: paymentMethod as PayrollRecord["paymentType"],
      status: record.status,
      jobIdShort,
    };
  });
}
