import type { LeadInteraction } from "./leadDetails";

export interface LeadPageAddress {
  id: string;
  addressName: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  preferenceDays: string;
  preferenceTime: string;
  frequency: string;
  serviceType: string;
  firstCleaningAmount: string;
  regularAmount: string;
  notes: string;
  additionalNotes: string;
}

export interface LeadEstimate {
  id: string;
  customer: string;
  email?: string;
  phone?: string;
  phoneNumber2?: string;
  service: string;
  amount: string;
  date: string;
  expiryDate: string;
  status: string;
  address: string;
  validUntil: string;
  origin?: string;
  referredBy?: string;
  hasJob?: boolean;
  interactions?: LeadInteraction[];
  addresses?: LeadPageAddress[];
  visitDate?: string;
  estimateApproved?: boolean;
  invoicePaid?: boolean;
  preferredDays?: string[];
  preferredTime?: string;
  frequency?: string;
  serviceType?: string;
  _dbId?: string;
  _customerId?: string;
  propertyType?: string;
  residenceType?: string;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasPets?: boolean;
  addOnServices?: string[];
  serviceAreas?: string[];
  businessName?: string;
  tags?: string[];
  notes?: string;
  additionalNotes?: string;
  specialInstructions?: string;
}

export interface LeadInvoiceStatus {
  deposit: "pending" | "paid" | "none";
  final: "pending" | "paid" | "none";
  totalPaid: number;
  totalPending: number;
}
