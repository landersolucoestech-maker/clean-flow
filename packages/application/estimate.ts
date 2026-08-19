import type { Estimate, EstimateLineItem, EstimateStatus } from "../domain/crm";
import type { Money } from "../domain/identity";
import type { Repository } from "../contracts/repository";

export type CreateEstimateInput = Omit<Estimate, "id" | "number" | "status" | "subtotal" | "tax" | "total" | "createdAt" | "updatedAt"> & { status?: EstimateStatus };
export type UpdateEstimateInput = Partial<Pick<Estimate, "status" | "validUntil" | "notes" | "lineItems" | "taxRateBps">>;
export type EstimateRepository = Repository<Estimate, CreateEstimateInput, UpdateEstimateInput>;

function usd(amountMinor: number): Money { return { amountMinor, currency: "USD" }; }

export function calculateEstimateTotals(lineItems: readonly EstimateLineItem[], taxRateBps: number) {
  const subtotalMinor = lineItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice.amountMinor), 0);
  const taxMinor = Math.round(subtotalMinor * taxRateBps / 10000);
  return { subtotal: usd(subtotalMinor), tax: usd(taxMinor), total: usd(subtotalMinor + taxMinor) };
}

function validateEstimate(input: { leadId?: string; customerId?: string; lineItems: readonly EstimateLineItem[] }) {
  if (Boolean(input.leadId) === Boolean(input.customerId)) throw new Error("Estimate must belong to exactly one lead or customer");
  if (!input.lineItems.length) throw new Error("At least one estimate line item is required");
  if (input.lineItems.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice.amountMinor < 0)) throw new Error("Estimate line items must be valid");
}

export async function createEstimate(repository: EstimateRepository, input: CreateEstimateInput) {
  validateEstimate(input);
  return repository.create(input);
}

export async function updateEstimateStatus(repository: EstimateRepository, id: string, status: EstimateStatus) {
  return repository.update(id, { status });
}
