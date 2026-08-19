import { describe, expect, it } from "vitest";
import { createService, setServiceActive } from "./service-catalog";
import { MockServiceRepository } from "../data/mock-service-repository";

describe("service catalog application", () => {
  it("validates service structure", async () => {
    const repository = new MockServiceRepository();
    await expect(createService(repository, { name: "", category: "residential", defaultDurationMinutes: 120, allowedFrequencies: ["weekly"], addOnIds: [], active: true })).rejects.toThrow("Service name is required");
    await expect(createService(repository, { name: "Test", category: "residential", defaultDurationMinutes: 0, allowedFrequencies: ["weekly"], addOnIds: [], active: true })).rejects.toThrow("Default duration");
  });
  it("deactivates rather than deleting a service", async () => {
    const repository = new MockServiceRepository();
    const service = await createService(repository, { name: "Test", category: "residential", defaultDurationMinutes: 120, allowedFrequencies: ["weekly"], addOnIds: [], active: true });
    expect((await setServiceActive(repository, service.id, false)).active).toBe(false);
  });
});
