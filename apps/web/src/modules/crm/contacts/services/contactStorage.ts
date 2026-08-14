import type { Contact, ContactDraft } from "../types/contact";

const STORAGE_KEY = "maidflow.crm.contacts.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readContacts(): Contact[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Contact[]) : [];
  } catch (error) {
    console.error("Failed to read CRM contacts from local storage", error);
    return [];
  }
}

export function writeContacts(contacts: Contact[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function createContactRecord(draft: ContactDraft): Contact {
  const now = new Date().toISOString();
  return {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateContactRecord(contact: Contact, draft: ContactDraft): Contact {
  return {
    ...contact,
    ...draft,
    updatedAt: new Date().toISOString(),
  };
}

export { STORAGE_KEY as CONTACTS_STORAGE_KEY };
