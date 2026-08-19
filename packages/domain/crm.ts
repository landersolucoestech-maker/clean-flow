import type { EntityId, ISODateTime } from "./identity";

export type ContactKind = "person" | "business";
export type ContactStatus = "active" | "archived";
export type Contact = Readonly<{
  id: EntityId;
  kind: ContactKind;
  displayName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  preferredLanguage: "en" | "pt" | "es";
  status: ContactStatus;
  tags: readonly string[];
  createdAt: ISODateTime;
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
