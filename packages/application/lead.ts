import type { Lead, LeadStage } from "../domain/crm";
import type { Repository } from "../contracts/repository";

export type CreateLeadInput = Omit<Lead, "id" | "createdAt" | "updatedAt" | "stage"> & { stage?: LeadStage };
export type UpdateLeadInput = Partial<Omit<Lead, "id" | "createdAt">>;
export type LeadRepository = Repository<Lead, CreateLeadInput, UpdateLeadInput>;

export async function createLead(repository: LeadRepository, input: CreateLeadInput) {
  if (!input.contactId) throw new Error("A contact is required");
  if (!input.title.trim()) throw new Error("Lead title is required");
  return repository.create(input);
}

export async function updateLeadStage(repository: LeadRepository, id: string, stage: LeadStage) {
  return repository.update(id, { stage, updatedAt: new Date().toISOString() });
}
