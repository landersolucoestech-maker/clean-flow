import { describe, expect, it } from "vitest";
import { createLead, updateLeadStage } from "./lead";
import { MockLeadRepository } from "../data/mock-lead-repository";

describe("lead application", () => {
  it("requires a contact and title", async () => {
    const repository = new MockLeadRepository();
    await expect(createLead(repository, { contactId: "", title: "Test", preferredDays: [] })).rejects.toThrow("A contact is required");
    await expect(createLead(repository, { contactId: "contact-1", title: " ", preferredDays: [] })).rejects.toThrow("Lead title is required");
  });
  it("moves pipeline stage independently from estimate state", async () => {
    const repository = new MockLeadRepository();
    const lead = await createLead(repository, { contactId: "contact-1", title: "Opportunity", preferredDays: [] });
    const updated = await updateLeadStage(repository, lead.id, "visit_scheduled");
    expect(updated.stage).toBe("visit_scheduled");
  });
});
