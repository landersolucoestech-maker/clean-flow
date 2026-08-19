import type { EntityId, ISODateTime } from "./identity";

export type Contact = Readonly<{
  id: EntityId;
  displayName: string;
  email?: string;
  phone?: string;
}>;

export type CustomerStatus = "active" | "inactive";
export type Customer = Readonly<{
  id: EntityId;
  primaryContactId: EntityId;
  status: CustomerStatus;
  createdAt: ISODateTime;
}>;

export type LeadStage = "new" | "qualified" | "estimate_sent" | "won" | "lost";
export type Lead = Readonly<{
  id: EntityId;
  contactId: EntityId;
  stage: LeadStage;
  createdAt: ISODateTime;
}>;

export type EstimateStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type Estimate = Readonly<{
  id: EntityId;
  leadId?: EntityId;
  customerId?: EntityId;
  status: EstimateStatus;
  createdAt: ISODateTime;
}>;
