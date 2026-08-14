export const CONTACT_TYPES = [
  "Supplier",
  "Partner",
  "Service Provider",
  "Corporate",
  "Other",
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_STATUSES = ["Active", "Inactive"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface Contact {
  id: string;
  name: string;
  company: string;
  contactType: ContactType;
  email: string;
  phone: string;
  website: string;
  jobTitle: string;
  address: string;
  notes: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export type ContactDraft = Omit<Contact, "id" | "createdAt" | "updatedAt">;

export const EMPTY_CONTACT_DRAFT: ContactDraft = {
  name: "",
  company: "",
  contactType: "Other",
  email: "",
  phone: "",
  website: "",
  jobTitle: "",
  address: "",
  notes: "",
  status: "Active",
};
