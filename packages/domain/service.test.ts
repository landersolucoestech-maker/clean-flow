import { describe, expect, it } from "vitest";
import { isFrequencyAllowed } from "./service";
import { serviceFixtures } from "../test-fixtures/services";

describe("service catalog", () => {
  it("does not infer recurrence from service labels", () => {
    const oneTime = serviceFixtures.find((service) => service.id === "service-one-time")!;
    const regular = serviceFixtures.find((service) => service.id === "service-regular")!;
    expect(isFrequencyAllowed(oneTime, "one_time")).toBe(true);
    expect(isFrequencyAllowed(oneTime, "weekly")).toBe(false);
    expect(isFrequencyAllowed(regular, "every_2_weeks")).toBe(true);
  });
});
