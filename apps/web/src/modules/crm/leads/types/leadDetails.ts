export interface LeadInteraction {
  id: string;
  date: string;
  time: string;
  subject: string;
  attendedBy: string;
  notes: string;
  interaction_type?: string;
}

export interface LeadRoomSelection {
  kitchen: boolean;
  bathroom: boolean;
  bedroom: boolean;
  diningLiving: boolean;
  laundryRoom: boolean;
  addOns: boolean;
}

export interface LeadAddressData {
  id: string;
  addressName: string;
  address: string;
  preferenceDays: string;
  preferenceTime: string;
  frequency: string;
  serviceType: string;
  firstCleaningAmount: string;
  regularAmount: string;
  notes: string;
  additionalNotes: string;
  rooms?: LeadRoomSelection;
}

export interface LeadDetails {
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
  validUntil: string;
  origin?: string;
  referredBy?: string;
  hasJob?: boolean;
  interactions?: LeadInteraction[];
  addresses?: LeadAddressData[];
  visitDate?: string;
  estimateApproved?: boolean;
  invoicePaid?: boolean;
  notes?: string;
  additionalNotes?: string;
  _dbId?: string;
  _customerId?: string;
  propertyType?: string;
  residenceType?: string;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasPets?: boolean;
  addOnServices?: string[];
  businessName?: string;
  tags?: string[];
  specialInstructions?: string;
}
