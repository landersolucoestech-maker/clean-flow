import type { CustomerAccount, CustomerAccountRepository, CreateCustomerAccountInput, UpdateCustomerAccountInput } from "../application/customer-account";

export class MockCustomerAccountRepository implements CustomerAccountRepository {
  private records: CustomerAccount[];
  constructor(seed: readonly CustomerAccount[] = []) { this.records = [...seed]; }
  async list() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.customer.id === id) ?? null; }
  async create(input: CreateCustomerAccountInput) {
    const id = `customer-${this.records.length + 1}`;
    const account: CustomerAccount = {
      customer: { id, primaryContactId: input.primaryContact.id, status: "active", source: input.source, paymentMethod: input.paymentMethod, notes: input.notes, createdAt: new Date().toISOString() },
      primaryContact: input.primaryContact,
      locations: [{ ...input.location, id: `location-${this.records.length + 1}`, customerId: id }],
      totalJobs: 0,
      lifetimeRevenueMinor: 0,
    };
    this.records.push(account); return account;
  }
  async update(id: string, input: UpdateCustomerAccountInput) {
    const index = this.records.findIndex((record) => record.customer.id === id);
    if (index < 0) throw new Error("Customer not found");
    const updated = { ...this.records[index], customer: { ...this.records[index].customer, ...input } };
    this.records[index] = updated; return updated;
  }
}
