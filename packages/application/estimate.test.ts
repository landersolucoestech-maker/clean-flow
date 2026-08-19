import { describe, expect, it } from "vitest";
import { calculateEstimateTotals, createEstimate, updateEstimateStatus } from "./estimate";
import { MockEstimateRepository } from "../data/mock-estimate-repository";

const line = { id: "line-1", description: "Deep Cleaning", quantity: 2, unitPrice: { amountMinor: 12500, currency: "USD" as const } };

describe("estimate application", () => {
  it("calculates money in minor units", () => {
    expect(calculateEstimateTotals([line], 700).total.amountMinor).toBe(26750);
  });
  it("requires exactly one source", async () => {
    const repository = new MockEstimateRepository();
    await expect(createEstimate(repository, { leadId: "lead-1", customerId: "customer-1", lineItems: [line], taxRateBps: 0 })).rejects.toThrow("exactly one lead or customer");
    await expect(createEstimate(repository, { lineItems: [line], taxRateBps: 0 })).rejects.toThrow("exactly one lead or customer");
  });
  it("requires lines and updates status", async () => {
    const repository = new MockEstimateRepository();
    await expect(createEstimate(repository, { leadId: "lead-1", lineItems: [], taxRateBps: 0 })).rejects.toThrow("At least one estimate line item");
    const estimate = await createEstimate(repository, { leadId: "lead-1", lineItems: [line], taxRateBps: 0 });
    expect((await updateEstimateStatus(repository, estimate.id, "sent")).status).toBe("sent");
  });
});
