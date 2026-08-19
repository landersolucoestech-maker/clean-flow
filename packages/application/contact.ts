import type { Contact } from "../domain/crm";
import type { Repository } from "../contracts/repository";

export type CreateContactInput = Omit<Contact, "id" | "createdAt" | "status"> & { status?: Contact["status"] };
export type UpdateContactInput = Partial<Omit<Contact, "id" | "createdAt">>;
export type ContactRepository = Repository<Contact, CreateContactInput, UpdateContactInput>;

export async function listContacts(repository: ContactRepository) {
  return repository.list();
}

export async function createContact(repository: ContactRepository, input: CreateContactInput) {
  if (!input.displayName.trim()) throw new Error("Contact name is required");
  if (!input.email && !input.phone) throw new Error("At least one contact method is required");
  return repository.create(input);
}

export async function archiveContact(repository: ContactRepository, id: string) {
  return repository.update(id, { status: "archived" });
}
