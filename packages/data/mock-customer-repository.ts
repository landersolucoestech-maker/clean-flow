import type { Customer } from "../domain/crm";
import type { CreateCustomerInput, CustomerRepository, UpdateCustomerInput } from "../application/customer";

export class MockCustomerRepository implements CustomerRepository {
  private records: Customer[];
  constructor(seed: readonly Customer[] = []) { this.records = [...seed]; }
  async list() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.id === id) ?? null; }
  async create(input: CreateCustomerInput) {
    const record: Customer = { id: `customer-${this.records.length + 1}`, primaryContactId: input.primaryContactId, status: "active", createdAt: new Date().toISOString() };
    this.records.push(record);
    return record;
  }
  async update(id: string, input: UpdateCustomerInput) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("Customer not found");
    const updated: Customer = { ...this.records[index], ...input };
    this.records[index] = updated;
    return updated;
  }
}
