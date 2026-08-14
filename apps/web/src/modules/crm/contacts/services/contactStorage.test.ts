import { describe, expect, it } from "vitest";
import { createContactRecord, updateContactRecord } from "./contactStorage";
import { CONTACT_TYPES, EMPTY_CONTACT_DRAFT } from "../types/contact";

describe("CRM contact records", () => {
  it("keeps the requested contact classifications centralized", () => {
    expect(CONTACT_TYPES).toEqual([
      "Supplier",
      "Partner",
      "Service Provider",
      "Corporate",
      "Other",
    ]);
  });

  it("creates and updates a contact without changing its identity", () => {
    const created = createContactRecord({
      ...EMPTY_CONTACT_DRAFT,
      name: "Acme Services",
      contactType: "Service Provider",
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Acme Services");
    expect(created.contactType).toBe("Service Provider");
    expect(created.createdAt).toBeTruthy();

    const updated = updateContactRecord(created, {
      ...EMPTY_CONTACT_DRAFT,
      name: "Acme Services LLC",
      contactType: "Partner",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.name).toBe("Acme Services LLC");
    expect(updated.contactType).toBe("Partner");
    expect(updated.updatedAt).toBeTruthy();
  });
});
