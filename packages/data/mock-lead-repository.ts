import type { Lead } from "../domain/crm";
import type { CreateLeadInput, LeadRepository, UpdateLeadInput } from "../application/lead";

export class MockLeadRepository implements LeadRepository {
  private records: Lead[];
  constructor(seed: readonly Lead[] = []) { this.records = [...seed]; }
  async list() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.id === id) ?? null; }
  async create(input: CreateLeadInput) { const now = new Date().toISOString(); const lead: Lead = { ...input, id: `lead-${this.records.length + 1}`, stage: input.stage ?? "new", createdAt: now, updatedAt: now }; this.records.push(lead); return lead; }
  async update(id: string, input: UpdateLeadInput) { const index = this.records.findIndex((record) => record.id === id); if (index < 0) throw new Error("Lead not found"); const updated: Lead = { ...this.records[index], ...input }; this.records[index] = updated; return updated; }
}
