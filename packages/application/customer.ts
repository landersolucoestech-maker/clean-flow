import type { Customer } from "../domain/crm";
import type { Repository } from "../contracts/repository";

export type CreateCustomerInput = Pick<Customer, "primaryContactId">;
export type UpdateCustomerInput = Partial<Pick<Customer, "status">>;
export type CustomerRepository = Repository<Customer, CreateCustomerInput, UpdateCustomerInput>;

export async function listCustomers(repository: CustomerRepository) {
  return repository.list();
}
