import { useState } from "react";
import type { LeadAddressEntry, LeadInteractionEntry } from "../types/leadForm";

export interface LeadFormData {
  primaryContactName: string;
  businessName: string;
  email: string;
  phone: string;
  tags: string[];
  leadSource: string;
  referralType: "existing" | "manual";
  referralCustomerId: string;
  referralName: string;
  stage: string;
  serviceType: string;
  propertyType: string;
  residenceType: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  frequency: string;
  hasPets: boolean;
  serviceAreas: string[];
  addOnServices: string[];
  preferredDays: string[];
  preferredTime: string;
  visitDate: string;
  agreedAmount: string;
  validUntil: string;
  notes: string;
  additionalNotes: string;
  specialInstructions: string;
}

export const EMPTY_LEAD_FORM_DATA: LeadFormData = {
  primaryContactName: "",
  businessName: "",
  email: "",
  phone: "",
  tags: [],
  leadSource: "",
  referralType: "existing",
  referralCustomerId: "",
  referralName: "",
  stage: "new_lead",
  serviceType: "",
  propertyType: "",
  residenceType: "",
  squareFeet: "",
  bedrooms: "",
  bathrooms: "",
  frequency: "",
  hasPets: false,
  serviceAreas: [],
  addOnServices: [],
  preferredDays: [],
  preferredTime: "",
  visitDate: "",
  agreedAmount: "",
  validUntil: "",
  notes: "",
  additionalNotes: "",
  specialInstructions: "",
};

export const EMPTY_LEAD_ADDRESS: LeadAddressEntry = {
  id: "1",
  name: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
};

export function useLeadFormState() {
  const [formData, setFormData] = useState<LeadFormData>({ ...EMPTY_LEAD_FORM_DATA, tags: [], serviceAreas: [], addOnServices: [], preferredDays: [] });
  const [addresses, setAddresses] = useState<LeadAddressEntry[]>([{ ...EMPTY_LEAD_ADDRESS }]);
  const [interactions, setInteractions] = useState<LeadInteractionEntry[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [expandedAddOns, setExpandedAddOns] = useState<Record<string, boolean>>({});

  const resetLeadFormState = () => {
    setFormData({ ...EMPTY_LEAD_FORM_DATA, tags: [], serviceAreas: [], addOnServices: [], preferredDays: [] });
    setAddresses([{ ...EMPTY_LEAD_ADDRESS }]);
    setInteractions([]);
    setExpandedAreas({});
    setExpandedAddOns({});
  };

  return {
    formData,
    setFormData,
    addresses,
    setAddresses,
    interactions,
    setInteractions,
    expandedAreas,
    setExpandedAreas,
    expandedAddOns,
    setExpandedAddOns,
    resetLeadFormState,
  };
}
