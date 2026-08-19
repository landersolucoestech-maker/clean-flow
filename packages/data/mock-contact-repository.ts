import type { Contact } from "../domain/crm";
import type { ContactRepository, CreateContactInput, UpdateContactInput } from "../application/contact";

export class MockContactRepository implements ContactRepository {
  private records: Contact[];

  constructor(seed: readonly Contact[] = []) {
    this.records = [...seed];
  }

  async list() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.id === id) ?? null; }

  async create(input: CreateContactInput) {
    const record: Contact = {
      ...input,
      id: `contact-${this.records.length + 1}`,
      status: input.status ?? "active",
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  async update(id: string, input: UpdateContactInput) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("Contact not found");
    const updated: Contact = { ...this.records[index], ...input };
    this.records[index] = updated;
    return updated;
  }
}
