import type { EntityId } from "./identity";

export type StaffStatus = "active" | "inactive" | "on_leave";
export type StaffRole = "office_manager" | "cleaning_manager" | "virtual_assistant" | "cleaner" | "driver";
export type StaffMember = Readonly<{ id: EntityId; displayName: string; email?: string; phone?: string; role: StaffRole; status: StaffStatus; canDrive: boolean }>;
export type Team = Readonly<{ id: EntityId; name: string; memberIds: readonly EntityId[]; leadMemberId?: EntityId; active: boolean }>;

export function validateTeam(team: Pick<Team,"memberIds"|"leadMemberId">) {
  if (team.leadMemberId && !team.memberIds.includes(team.leadMemberId)) throw new Error("Team lead must be a team member");
}
