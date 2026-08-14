import { format } from "date-fns";
import type { Customer } from "@/hooks/useCustomers";

export interface CustomerFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone1: string;
  phone2: string;
  status: string;
  paymentMethod: string;
  customerSince: Date;
  source: string;
  referralName: string;
  inactiveDate: Date | null;
  inactiveReason: string;
  billingContactName: string;
  billingContactRelationship: string;
  billingContactEmail: string;
  billingContactPhone: string;
  billingContactPhone2: string;
  billingContactNotes: string;
}

export interface FormAddress {
  id: string;
  name: string;
  street: string;
  complement: string;
  city: string;
  state: string;
  postal_code: string;
  notes: string;
  additional_notes: string;
  frequency: string;
  preferred_day: string;
}

export function createEmptyCustomerFormState(now = new Date()): CustomerFormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone1: "",
    phone2: "",
    status: "active",
    paymentMethod: "quickbooks",
    customerSince: now,
    source: "",
    referralName: "",
    inactiveDate: null,
    inactiveReason: "",
    billingContactName: "",
    billingContactRelationship: "",
    billingContactEmail: "",
    billingContactPhone: "",
    billingContactPhone2: "",
    billingContactNotes: "",
  };
}

export function createEmptyFormAddress(id = "1"): FormAddress {
  return {
    id,
    name: "Home",
    street: "",
    complement: "",
    city: "",
    state: "",
    postal_code: "",
    notes: "",
    additional_notes: "",
    frequency: "weekly",
    preferred_day: "monday",
  };
}

export function mapCustomerToFormState(customer: Customer): CustomerFormState {
  const isInactive = customer.status !== "Active";
  const referralSource = customer.source?.startsWith("referral:");

  return {
    firstName: customer.name?.split(" ")[0] || "",
    lastName: customer.name?.split(" ").slice(1).join(" ") || "",
    email: customer.email || "",
    phone1: customer.phone || "",
    phone2: customer.phone2 || "",
    status: isInactive ? "inactive" : "active",
    paymentMethod: customer.payment_method || "quickbooks",
    customerSince: customer.customer_since ? new Date(customer.customer_since) : new Date(),
    source: referralSource ? "referral" : customer.source || "",
    referralName: referralSource ? customer.source?.replace("referral:", "") || "" : "",
    inactiveDate: isInactive && customer.additional_info?.includes("Inactive since:")
      ? new Date(customer.additional_info.match(/Inactive since: ([^|]+)/)?.[1] || new Date())
      : isInactive
        ? new Date()
        : null,
    inactiveReason: isInactive && customer.additional_info?.includes("Reason:")
      ? customer.additional_info.match(/Reason: (.+)/)?.[1] || ""
      : "",
    billingContactName: customer.billing_contact_name || "",
    billingContactRelationship: customer.billing_contact_relationship || "",
    billingContactEmail: customer.billing_contact_email || "",
    billingContactPhone: customer.billing_contact_phone || "",
    billingContactPhone2: customer.billing_contact_phone2 || "",
    billingContactNotes: customer.billing_contact_notes || "",
  };
}

export function mapCustomerAddresses(customer: Customer): FormAddress[] {
  if (!customer.addresses?.length) return [createEmptyFormAddress()];

  return customer.addresses.map((address, index) => ({
    id: address.id || String(index + 1),
    name: address.name || "Home",
    street: address.street || "",
    complement: address.complement || "",
    city: address.city || "",
    state: address.state || "",
    postal_code: address.postal_code || "",
    notes: address.notes || "",
    additional_notes: address.additional_notes || "",
    frequency: address.frequency || "weekly",
    preferred_day: address.preferred_day || "monday",
  }));
}

export function buildCustomerFormData(formData: CustomerFormState, addresses: FormAddress[]) {
  let additionalInfo = "";
  if (formData.status === "inactive") {
    const inactiveDate = formData.inactiveDate ?? new Date();
    additionalInfo = `Inactive since: ${format(inactiveDate, "yyyy-MM-dd")}`;
    if (formData.inactiveReason) additionalInfo += ` | Reason: ${formData.inactiveReason}`;
  }

  return {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone1: formData.phone1,
    phone2: formData.phone2,
    status: formData.status,
    paymentMethod: formData.paymentMethod,
    customerSince: formData.customerSince,
    source: formData.source === "referral" && formData.referralName
      ? `referral:${formData.referralName}`
      : formData.source,
    additionalInfo: additionalInfo || undefined,
    billingContactName: formData.billingContactName || undefined,
    billingContactRelationship: formData.billingContactRelationship || undefined,
    billingContactEmail: formData.billingContactEmail || undefined,
    billingContactPhone: formData.billingContactPhone || undefined,
    billingContactPhone2: formData.billingContactPhone2 || undefined,
    billingContactNotes: formData.billingContactNotes || undefined,
    addresses: addresses.map((address) => ({
      name: address.name,
      street: address.street,
      complement: address.complement,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      notes: address.notes,
      additional_notes: address.additional_notes,
      frequency: address.frequency,
      preferred_day: address.preferred_day,
    })),
  };
}
