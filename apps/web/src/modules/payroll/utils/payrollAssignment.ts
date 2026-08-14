import type { Staff } from "@/hooks/useStaff";
import { isCompletedJobStatus, isUuid, normalizePayrollName } from "./payrollView";

export function isScheduledOrInProgressPayrollStatus(status: string | null): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase().trim();
  return (
    normalized.includes("scheduled") ||
    normalized.includes("agendado") ||
    normalized.includes("in_progress") ||
    normalized.includes("em_andamento") ||
    normalized.includes("on_our_way") ||
    normalized.includes("a_caminho") ||
    normalized.includes("cleaning")
  );
}

export function shouldIncludePayrollJobStatus(status: string | null, includeNonCompleted: boolean): boolean {
  const completed = isCompletedJobStatus(status);
  if (!includeNonCompleted) return completed;
  return completed || isScheduledOrInProgressPayrollStatus(status);
}

export function resolveAssignedPayrollStaff(assignedValue: string, staffList: Staff[]): Staff[] {
  if (!assignedValue) return [];

  const raw = assignedValue.trim();
  if (isUuid(raw)) {
    const staff = staffList.find((member) => member.id === raw);
    return staff ? [staff] : [];
  }

  const teamMatch = raw.match(/^team\s*(\d+)$/i) || raw.match(/^(\d+)$/);
  if (teamMatch) {
    const teamNumber = teamMatch[1];
    return staffList.filter((member) => member.is_active && member.team === teamNumber);
  }

  const normalizedAssigned = normalizePayrollName(raw);
  if (!normalizedAssigned) return [];

  const exactMatch = staffList.find(
    (member) => normalizePayrollName(member.name) === normalizedAssigned,
  );
  if (exactMatch) return [exactMatch];

  let best: { staff: Staff; score: number } | null = null;
  for (const member of staffList) {
    const normalizedStaffName = normalizePayrollName(member.name);
    if (!normalizedStaffName) continue;

    let score = 0;
    if (normalizedStaffName.includes(normalizedAssigned)) score += 50;
    if (normalizedAssigned.includes(normalizedStaffName)) score += 30;

    const assignedTokens = normalizedAssigned.split(" ");
    const staffTokens = new Set(normalizedStaffName.split(" "));
    score += assignedTokens.filter((token) => staffTokens.has(token)).length * 6;
    if (assignedTokens.length === 1 && staffTokens.has(assignedTokens[0])) score += 25;

    if (!best || score > best.score) best = { staff: member, score };
  }

  return best && best.score >= 15 ? [best.staff] : [];
}
