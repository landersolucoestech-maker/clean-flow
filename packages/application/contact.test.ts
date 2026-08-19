import { describe, expect, it } from "vitest";
import { archiveContact, createContact, updateContact } from "./contact";
import { MockContactRepository } from "../data/mock-contact-repository";

describe("contact application", () => {
  it("requires a name", async () => {
    const repository = new MockContactRepository();
    await expect(createContact(repository, { kind: "person", displayName: " ", email: "a@example.com", preferredLanguage: "en", tags: [] })).rejects.toThrow("Contact name is required");
  });

  it("requires at least one contact method", async () => {
    const repository = new MockContactRepository();
    await expect(createContact(repository, { kind: "person", displayName: "Alex Morgan", preferredLanguage: "en", tags: [] })).rejects.toThrow("At least one contact method is required");
  });

  it("creates, updates and archives through the repository boundary", async () => {
    const repository = new MockContactRepository();
    const created = await createContact(repository, { kind: "person", displayName: "Alex Morgan", phone: "+1 407 555 0100", preferredLanguage: "en", tags: [] });
    expect(created.status).toBe("active");
    const updated = await updateContact(repository, created.id, { displayName: "Alex J. Morgan" });
    expect(updated.displayName).toBe("Alex J. Morgan");
    const archived = await archiveContact(repository, created.id);
    expect(archived.status).toBe("archived");
  });
});
