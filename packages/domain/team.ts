import type { EntityId } from "./identity";

export type StaffStatus = "active" | "inactive" | "on_leave";
export type StaffRole = "office_manager" | "cleaning_manager" | "virtual_assistant" | "cleaner" | "driver";

export type StaffMember = Readonly<{
  id: EntityId;
  displayName: string;
  role: StaffRole;
  status: StaffStatus;
}>;

export type Team = Readonly<{
  id: EntityId;
  name: string;
  memberIds: readonly EntityId[];
  leadMemberId?: EntityId;
}>;
