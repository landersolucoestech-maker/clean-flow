import type { EntityId, ISODateTime } from "./identity";
import type { ServiceFrequency } from "./service";

export type ContactKind = "person" | "business";
export type ContactStatus = "active" | "archived";
export type Contact = Readonly<{ id: EntityId; kind: ContactKind; displayName: string; firstName?: string; lastName?: string; companyName?: string; email?: string; phone?: string; preferredLanguage: "en" | "pt" | "es"; status: ContactStatus; tags: readonly string[]; createdAt: ISODateTime }>;

export type PostalAddress = Readonly<{ street1: string; street2?: string; city: string; state: string; postalCode: string }>;
export type CustomerStatus = "active" | "inactive";
export type CustomerSource = "website" | "phone" | "google" | "facebook" | "instagram" | "nextdoor" | "walk_in" | "referral" | "other";
export type PaymentMethod = "card" | "cash" | "check" | "zelle" | "venmo" | "ach" | "other";
export type Customer = Readonly<{ id: EntityId; primaryContactId: EntityId; status: CustomerStatus; source?: CustomerSource; paymentMethod?: PaymentMethod; notes?: string; createdAt: ISODateTime }>;

export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type ServiceLocation = Readonly<{ id: EntityId; customerId: EntityId; name: string; street1: string; street2?: string; city: string; state: string; postalCode: string; frequency?: ServiceFrequency; preferredDay?: Weekday; notes?: string }>;

export type LeadStage = "new" | "qualifying" | "visit_scheduled" | "estimate_pending" | "estimate_sent" | "negotiation" | "won" | "lost" | "nurture";
export type LeadPropertyType = "residential" | "commercial" | "other";
export type Lead = Readonly<{ id: EntityId; contactId: EntityId; title: string; stage: LeadStage; source?: CustomerSource; serviceDefinitionId?: EntityId; frequency?: ServiceFrequency; location?: PostalAddress; propertyType?: LeadPropertyType; residenceType?: string; squareFeet?: number; bedrooms?: number; bathrooms?: number; hasPets?: boolean; preferredDays: readonly Weekday[]; preferredTime?: "morning" | "afternoon" | "evening"; referralContactId?: EntityId; notes?: string; createdAt: ISODateTime; updatedAt: ISODateTime }>;

export type EstimateStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type Estimate = Readonly<{ id: EntityId; leadId?: EntityId; customerId?: EntityId; status: EstimateStatus; createdAt: ISODateTime }>;
