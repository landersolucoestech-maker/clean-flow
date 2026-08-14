import type {
  PayrollListRow,
  PayrollRecord,
  PayrollSortDirection,
  PayrollSortField,
} from "../types/payrollView";

export function normalizePayrollName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isCompletedJobStatus(status: string | null) {
  if (!status) return false;
  const normalized = status.toLowerCase().trim();
  return (
    normalized.includes("completed") ||
    normalized.includes("finished") ||
    normalized.includes("done") ||
    normalized.includes("conclu") ||
    normalized.includes("finaliz")
  );
}

export function sortPayrollRecords(
  data: PayrollRecord[],
  field: PayrollSortField,
  direction: PayrollSortDirection,
) {
  return [...data].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case "period":
        comparison = a.period.localeCompare(b.period);
        break;
      case "employeeName":
        comparison = a.employeeName.localeCompare(b.employeeName);
        break;
      case "baseValue":
        comparison = a.baseValue - b.baseValue;
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return direction === "asc" ? comparison : -comparison;
  });
}

export function buildPayrollListRows(
  records: PayrollRecord[],
  staff: Array<{ id: string; name: string }>,
  sortField: PayrollSortField,
  sortDirection: PayrollSortDirection,
): PayrollListRow[] {
  const statusRank: Record<PayrollRecord["status"], number> = { Paid: 0, Pending: 1, Overdue: 2 };
  const byGroup = new Map<string, PayrollListRow>();

  for (const record of records) {
    const resolvedStaffId = record.staffId ?? staff.find((member) => member.name === record.employeeName)?.id ?? null;
    const unitValue = record.baseValue;
    const groupId = `${record.periodStartISO}|${record.periodEndISO}|${resolvedStaffId ?? record.employeeName}`;
    const current = byGroup.get(groupId);

    if (!current) {
      byGroup.set(groupId, {
        id: groupId,
        period: record.period,
        periodStartISO: record.periodStartISO,
        periodEndISO: record.periodEndISO,
        employeeName: record.employeeName,
        staffId: resolvedStaffId,
        jobCount: 1,
        unitValue,
        bonus: record.bonus,
        value: unitValue + record.bonus,
        paymentType: record.paymentType,
        status: record.status,
        recordIds: [record.id],
      });
      continue;
    }

    current.jobCount += 1;
    current.recordIds.push(record.id);
    current.bonus += record.bonus;
    current.value += unitValue + record.bonus;

    if (statusRank[record.status] > statusRank[current.status]) {
      current.status = record.status;
    }
  }

  const rows = Array.from(byGroup.values());
  rows.sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "period":
        comparison = a.periodStartISO.localeCompare(b.periodStartISO);
        break;
      case "employeeName":
        comparison = a.employeeName.localeCompare(b.employeeName);
        break;
      case "baseValue":
        comparison = a.value - b.value;
        break;
      case "status":
        comparison = statusRank[a.status] - statusRank[b.status];
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return rows;
}
