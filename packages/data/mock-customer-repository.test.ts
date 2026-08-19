import { describe, expect, it } from "vitest";
import { MockCustomerRepository } from "./mock-customer-repository";

describe("MockCustomerRepository", () => {
  it("supports customer state without a backend", async () => {
    const repository = new MockCustomerRepository();
    const created = await repository.create({ primaryContactId: "contact-1" });
    expect(created.status).toBe("active");
    const updated = await repository.update(created.id, { status: "inactive" });
    expect(updated.status).toBe("inactive");
    expect(await repository.list()).toHaveLength(1);
  });
});
