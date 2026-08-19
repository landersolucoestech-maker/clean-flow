import type { Contact, Customer, CustomerSource, PaymentMethod, ServiceLocation } from "../domain/crm";

export type CustomerAccount = Readonly<{
  customer: Customer;
  primaryContact: Contact;
  locations: readonly ServiceLocation[];
  totalJobs: number;
  lifetimeRevenueMinor: number;
  lastServiceAt?: string;
}>;

export type CreateCustomerAccountInput = Readonly<{
  primaryContact: Contact;
  source?: CustomerSource;
  paymentMethod?: PaymentMethod;
  notes?: string;
  location: Omit<ServiceLocation, "id" | "customerId">;
}>;

export type UpdateCustomerAccountInput = Partial<Pick<Customer, "status" | "source" | "paymentMethod" | "notes">>;

export interface CustomerAccountRepository {
  list(): Promise<readonly CustomerAccount[]>;
  getById(id: string): Promise<CustomerAccount | null>;
  create(input: CreateCustomerAccountInput): Promise<CustomerAccount>;
  update(id: string, input: UpdateCustomerAccountInput): Promise<CustomerAccount>;
}

export async function createCustomerAccount(repository: CustomerAccountRepository, input: CreateCustomerAccountInput) {
  if (!input.location.street1.trim() || !input.location.city.trim() || !input.location.state.trim() || !input.location.postalCode.trim()) throw new Error("A complete service location is required");
  return repository.create(input);
}

export async function archiveCustomerAccount(repository: CustomerAccountRepository, id: string) {
  return repository.update(id, { status: "inactive" });
}
