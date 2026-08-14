import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Contact, ContactDraft } from "../types/contact";
import {
  createContactRecord,
  readContacts,
  updateContactRecord,
  writeContacts,
} from "../services/contactStorage";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [storageScope, setStorageScope] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError);
        setIsLoading(false);
        return;
      }
      setStorageScope(data.session?.user.id || "authenticated-user");
    });

    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(() => {
    if (!storageScope) return;
    try {
      setError(null);
      setContacts(readContacts(storageScope));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Failed to load contacts"));
    } finally {
      setIsLoading(false);
    }
  }, [storageScope]);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback((next: Contact[]) => {
    if (!storageScope) throw new Error("Contact storage scope is not ready");
    writeContacts(storageScope, next);
    setContacts(next);
  }, [storageScope]);

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
