import { describe, expect, it } from "vitest";
import { deriveContactPermissions } from "./contactPermissions";

describe("deriveContactPermissions", () => {
  it("preserves admin wildcard without adding redundant permissions", () => {
    expect(deriveContactPermissions(["*"])).toEqual(["*"]);
  });

  it("derives only the contact permissions matching existing customer access", () => {
    expect(deriveContactPermissions(["customers.view", "customers.edit"])).toEqual([
      "customers.view",
      "customers.edit",
      "contacts.view",
      "contacts.edit",
    ]);
  });

  it("does not grant create, edit or delete when customer role does not have them", () => {
    const permissions = deriveContactPermissions(["customers.view"]);

    expect(permissions).toContain("contacts.view");
    expect(permissions).not.toContain("contacts.create");
    expect(permissions).not.toContain("contacts.edit");
    expect(permissions).not.toContain("contacts.delete");
  });
});
