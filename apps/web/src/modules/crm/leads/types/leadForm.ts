export interface LeadAddressEntry {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

export interface LeadInteractionEntry {
  id: string;
  type: string;
  description: string;
  date: string;
  time: string;
}
