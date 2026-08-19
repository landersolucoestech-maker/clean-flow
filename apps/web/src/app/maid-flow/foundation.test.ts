import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("keeps CRM as one navigation and routed surface with three internal tabs", () => {
    expect(allNavigationItems.filter((item) => item.path.startsWith("/crm"))).toEqual([
      expect.objectContaining({ label: "CRM", path: "/crm" }),
    ]);

    const routes = readFileSync(join(process.cwd(), "apps/web/src/app/maid-flow/MaidFlowRoutes.tsx"), "utf8");
    const crm = readFileSync(join(process.cwd(), "apps/web/src/app/maid-flow/CrmPage.tsx"), "utf8");

    expect(routes).toContain('path="/crm"');
    expect(routes).not.toContain('/crm/customers');
    expect(routes).not.toContain('/crm/contacts');
    expect(routes).not.toContain('/crm/leads');
    expect(crm).toContain('label: "Customers"');
    expect(crm).toContain('label: "Contacts"');
    expect(crm).toContain('label: "Leads"');
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
