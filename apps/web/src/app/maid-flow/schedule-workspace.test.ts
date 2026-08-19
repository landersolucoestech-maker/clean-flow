import { describe, expect, it } from "vitest";
import { createJob } from "../../../../../packages/application/job";
import { maidFlowRepositories } from "./repositories";

describe("Maid Flow Schedule workspace", () => {
  it("creates scheduled services through the shared Schedule repository", async () => {
    const [accounts, services] = await Promise.all([
      maidFlowRepositories.crm.customers.list(),
      maidFlowRepositories.services.list(),
    ]);
    const account = accounts.find((row) => row.customer.status === "active" && row.locations.length > 0)!;
    const service = services.find((row) => row.active && row.allowedFrequencies.length > 0)!;
    const frequency = service.allowedFrequencies[0];

    const created = await createJob(maidFlowRepositories.schedule, {
      customerId: account.customer.id,
      locationId: account.locations[0].id,
      serviceId: service.id,
      startsAt: "2026-08-24T13:00:00.000Z",
      durationMinutes: service.defaultDurationMinutes,
      price: { amountMinor: 15000, currency: "USD" },
      assignedStaffIds: [],
      recurrence: { type: "none" },
      serviceFrequency: frequency,
    }, service);

    const rows = await maidFlowRepositories.schedule.list();
    expect(rows.some((row) => row.id === created.id)).toBe(true);
    expect(created.status).toBe("scheduled");
  });

  it("rejects a cadence not allowed by the selected service", async () => {
    const services = await maidFlowRepositories.services.list();
    const service = services.find((row) => row.active && !row.allowedFrequencies.includes("daily"))!;
    const accounts = await maidFlowRepositories.crm.customers.list();
    const account = accounts.find((row) => row.customer.status === "active" && row.locations.length > 0)!;

    await expect(createJob(maidFlowRepositories.schedule, {
      customerId: account.customer.id,
      locationId: account.locations[0].id,
      serviceId: service.id,
      startsAt: "2026-08-25T13:00:00.000Z",
      durationMinutes: service.defaultDurationMinutes,
      price: { amountMinor: 10000, currency: "USD" },
      assignedStaffIds: [],
      recurrence: { type: "daily", interval: 1 },
      serviceFrequency: "daily",
    }, service)).rejects.toThrow("Frequency is not allowed for this service");
  });
});
