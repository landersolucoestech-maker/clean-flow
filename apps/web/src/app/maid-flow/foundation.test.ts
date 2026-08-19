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

  it("keeps platform administration separate from settings", () => {
    expect(allNavigationItems.some((item) => item.path === "/platform")).toBe(true);
    expect(allNavigationItems.some((item) => item.path === "/settings")).toBe(true);
  });
});
