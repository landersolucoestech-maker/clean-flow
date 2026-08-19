import { describe, expect, it } from "vitest";
import { createContact } from "../../../../../packages/application/contact";
import { maidFlowRepositories } from "./repositories";

describe("Maid Flow CRM workspace", () => {
  it("shares contact state across CRM tabs through the composition root", async () => {
    const contact = await createContact(maidFlowRepositories.crm.contacts, {
      kind: "person",
      displayName: "CRM shared state check",
      email: "crm-shared-state@example.com",
      preferredLanguage: "en",
      tags: ["test"],
    });

    const contacts = await maidFlowRepositories.crm.contacts.list();
    expect(contacts.some((record) => record.id === contact.id)).toBe(true);
  });

  it("exposes exactly the three CRM repositories needed by the tabbed workspace", () => {
    expect(Object.keys(maidFlowRepositories.crm).sort()).toEqual(["contacts", "customers", "leads"]);
  });
});
