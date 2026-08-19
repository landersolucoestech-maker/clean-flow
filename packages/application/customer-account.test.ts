import { describe, expect, it } from "vitest";
import { archiveCustomerAccount, createCustomerAccount } from "./customer-account";
import { MockCustomerAccountRepository } from "../data/mock-customer-account-repository";
import { contactFixtures } from "../test-fixtures/contacts";

describe("customer account application", () => {
  it("requires a complete service location", async () => {
    const repository = new MockCustomerAccountRepository();
    await expect(createCustomerAccount(repository, { primaryContact: contactFixtures[0], location: { name: "Home", street1: "", city: "Orlando", state: "FL", postalCode: "32801" } })).rejects.toThrow("A complete service location is required");
  });
  it("creates and archives a customer account", async () => {
    const repository = new MockCustomerAccountRepository();
    const created = await createCustomerAccount(repository, { primaryContact: contactFixtures[0], source: "referral", location: { name: "Home", street1: "123 Main St", city: "Orlando", state: "FL", postalCode: "32801" } });
    expect(created.customer.status).toBe("active");
    expect(created.locations).toHaveLength(1);
    const archived = await archiveCustomerAccount(repository, created.customer.id);
    expect(archived.customer.status).toBe("inactive");
  });
});
