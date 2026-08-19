import type { Contact } from "../domain/crm";
import type { Repository } from "../contracts/repository";

export type CreateContactInput = Omit<Contact, "id" | "createdAt" | "status"> & { status?: Contact["status"] };
export type UpdateContactInput = Partial<Omit<Contact, "id" | "createdAt">>;
export type ContactRepository = Repository<Contact, CreateContactInput, UpdateContactInput>;

function validateContact(input: { displayName?: string; email?: string; phone?: string }) {
  if (input.displayName !== undefined && !input.displayName.trim()) throw new Error("Contact name is required");
  if (input.email !== undefined || input.phone !== undefined) {
    if (!input.email?.trim() && !input.phone?.trim()) throw new Error("At least one contact method is required");
  }
}

export async function listContacts(repository: ContactRepository) {
  return repository.list();
}

export async function createContact(repository: ContactRepository, input: CreateContactInput) {
  validateContact(input);
  if (!input.email && !input.phone) throw new Error("At least one contact method is required");
  return repository.create(input);
}

export async function updateContact(repository: ContactRepository, id: string, input: UpdateContactInput) {
  validateContact(input);
  return repository.update(id, input);
}

export async function archiveContact(repository: ContactRepository, id: string) {
  return repository.update(id, { status: "archived" });
}
