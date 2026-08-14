import type { Contact, ContactDraft } from "../types/contact";

const STORAGE_PREFIX = "maidflow.crm.contacts.v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getContactsStorageKey(scope: string): string {
  return `${STORAGE_PREFIX}:${scope || "anonymous"}`;
}

export function readContacts(scope: string): Contact[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(getContactsStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Contact[]) : [];
  } catch (error) {
    console.error("Failed to read CRM contacts from local storage", error);
    return [];
  }
}

export function writeContacts(scope: string, contacts: Contact[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(getContactsStorageKey(scope), JSON.stringify(contacts));
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
