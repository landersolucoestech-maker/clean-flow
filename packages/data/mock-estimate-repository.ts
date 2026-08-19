import type { Estimate } from "../domain/crm";
import { calculateEstimateTotals, type CreateEstimateInput, type EstimateRepository, type UpdateEstimateInput } from "../application/estimate";

export class MockEstimateRepository implements EstimateRepository {
  private records: Estimate[];
  constructor(seed: readonly Estimate[] = []) { this.records = [...seed]; }
  async list() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.id === id) ?? null; }
  async create(input: CreateEstimateInput) {
    const now = new Date().toISOString();
    const totals = calculateEstimateTotals(input.lineItems, input.taxRateBps);
    const estimate: Estimate = { ...input, ...totals, id: `estimate-${this.records.length + 1}`, number: `EST-${String(this.records.length + 1001).padStart(4, "0")}`, status: input.status ?? "draft", createdAt: now, updatedAt: now };
    this.records.push(estimate);
    return estimate;
  }
  async update(id: string, input: UpdateEstimateInput) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("Estimate not found");
    const current = this.records[index];
    const lineItems = input.lineItems ?? current.lineItems;
    const taxRateBps = input.taxRateBps ?? current.taxRateBps;
    const updated: Estimate = { ...current, ...input, ...calculateEstimateTotals(lineItems, taxRateBps), updatedAt: new Date().toISOString() };
    this.records[index] = updated;
    return updated;
  }
}
