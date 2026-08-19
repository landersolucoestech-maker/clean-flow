import { describe, expect, it } from "vitest";
import { allNavigationItems } from "./navigation";

describe("Maid Flow foundation navigation", () => {
  it("uses unique canonical paths", () => {
    const paths = allNavigationItems.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("keeps the operational dashboard at the root", () => {
    expect(allNavigationItems.some((item) => item.label === "Dashboard" && item.path === "/")).toBe(true);
  });

  it("keeps CRM as one navigation surface", () => {
    expect(allNavigationItems.filter((item) => item.path.startsWith("/crm"))).toEqual([
      expect.objectContaining({ label: "CRM", path: "/crm" }),
    ]);
  });

  it("keeps Schedule as the only operations navigation surface", () => {
    const operations = allNavigationItems.filter((item) => item.path.startsWith("/operations"));
    expect(operations).toEqual([
      expect.objectContaining({ label: "Schedule", path: "/operations/schedule" }),
    ]);
    expect(allNavigationItems.some((item) => /jobs/i.test(item.label) || item.path.includes("/jobs"))).toBe(false);
  });

  it("does not mix platform administration into workspace navigation", () => {
    expect(allNavigationItems.some((item) => item.path === "/platform")).toBe(false);
    expect(allNavigationItems.some((item) => item.path === "/settings")).toBe(true);
  });
});
