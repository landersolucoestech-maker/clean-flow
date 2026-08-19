import type { EntityId, ISODateTime, Money } from "./identity";

export type JobStatus = "scheduled" | "on_the_way" | "in_progress" | "completed" | "cancelled";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type RecurrenceRule =
  | Readonly<{ type: "none" }>
  | Readonly<{ type: "daily"; interval: number }>
  | Readonly<{ type: "weekly"; interval: number; weekdays: readonly Weekday[] }>
  | Readonly<{ type: "monthly"; interval: number; dayOfMonth?: number }>;

export type Job = Readonly<{
  id: EntityId;
  customerId: EntityId;
  serviceId: EntityId;
  locationId: EntityId;
  startsAt: ISODateTime;
  durationMinutes: number;
  price: Money;
  assignedTeamId?: EntityId;
  assignedStaffIds: readonly EntityId[];
  status: JobStatus;
  recurrence: RecurrenceRule;
}>;
