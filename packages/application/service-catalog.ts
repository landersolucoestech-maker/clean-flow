import type { ServiceDefinition } from "../domain/service";
import type { Repository } from "../contracts/repository";

export type CreateServiceInput = Omit<ServiceDefinition, "id">;
export type UpdateServiceInput = Partial<Omit<ServiceDefinition, "id">>;
export type ServiceRepository = Repository<ServiceDefinition, CreateServiceInput, UpdateServiceInput>;

export async function createService(repository: ServiceRepository, input: CreateServiceInput) {
  if (!input.name.trim()) throw new Error("Service name is required");
  if (input.defaultDurationMinutes <= 0) throw new Error("Default duration must be greater than zero");
  if (!input.allowedFrequencies.length) throw new Error("At least one frequency is required");
  return repository.create(input);
}

export async function setServiceActive(repository: ServiceRepository, id: string, active: boolean) {
  return repository.update(id, { active });
}
