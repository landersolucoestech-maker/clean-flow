import { describe, expect, it } from "vitest";
import type { RecurrenceRule } from "./job";

function nextWeeklyIntervalDays(rule: Extract<RecurrenceRule, { type: "weekly" }>) {
  return rule.interval * 7;
}

describe("job recurrence contract", () => {
  it("models recurrence independently from service type", () => {
    const biweekly: RecurrenceRule = { type: "weekly", interval: 2, weekdays: ["mon"] };
    expect(biweekly.type).toBe("weekly");
    if (biweekly.type === "weekly") expect(nextWeeklyIntervalDays(biweekly)).toBe(14);
  });
});
