import type { ServiceDefinition } from "../domain/service";
import type { CreateServiceInput, ServiceRepository, UpdateServiceInput } from "../application/service-catalog";

export class MockServiceRepository implements ServiceRepository {
  private records: ServiceDefinition[];
  constructor(seed: readonly ServiceDefinition[] = []) { this.records = [...seed]; }
  async list() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.id === id) ?? null; }
  async create(input: CreateServiceInput) { const record: ServiceDefinition = { ...input, id: `service-${this.records.length + 1}` }; this.records.push(record); return record; }
  async update(id: string, input: UpdateServiceInput) { const index = this.records.findIndex((record) => record.id === id); if (index < 0) throw new Error("Service not found"); const updated: ServiceDefinition = { ...this.records[index], ...input }; this.records[index] = updated; return updated; }
}
