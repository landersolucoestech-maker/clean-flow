import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Contact, ContactDraft } from "../types/contact";
import {
  createContactRecord,
  readContacts,
  updateContactRecord,
  writeContacts,
} from "../services/contactStorage";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(() => {
    try {
      setError(null);
      setContacts(readContacts());
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Failed to load contacts"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback((next: Contact[]) => {
    writeContacts(next);
    setContacts(next);
  }, []);

  const createContact = useCallback((draft: ContactDraft) => {
    const created = createContactRecord(draft);
    persist([created, ...contacts]);
    toast.success("Contact created successfully");
    return created;
  }, [contacts, persist]);

  const updateContact = useCallback((id: string, draft: ContactDraft) => {
    let updated: Contact | null = null;
    const next = contacts.map((contact) => {
      if (contact.id !== id) return contact;
      updated = updateContactRecord(contact, draft);
      return updated;
    });
    persist(next);
    toast.success("Contact updated successfully");
    return updated;
  }, [contacts, persist]);

  const deleteContact = useCallback((id: string) => {
    persist(contacts.filter((contact) => contact.id !== id));
    toast.success("Contact deleted successfully");
  }, [contacts, persist]);

  return {
    contacts,
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
    reload,
  };
}
