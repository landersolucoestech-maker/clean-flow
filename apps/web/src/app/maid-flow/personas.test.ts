import { describe, expect, it } from "vitest";
import { can, personas } from "./personas";

describe("Maid Flow frontend personas", () => {
  it("keeps platform administration isolated from tenant admin", () => {
    const admin = personas.find((persona) => persona.id === "admin");
    const platformAdmin = personas.find((persona) => persona.id === "platform_admin");
    expect(admin).toBeDefined();
    expect(platformAdmin).toBeDefined();
    expect(can(admin!, "platform.manage")).toBe(false);
    expect(can(platformAdmin!, "platform.manage")).toBe(true);
    expect(can(platformAdmin!, "crm.read")).toBe(false);
  });

  it("limits field personas to operational read access", () => {
    for (const id of ["cleaner", "driver"] as const) {
      const persona = personas.find((item) => item.id === id)!;
      expect(can(persona, "operations.read")).toBe(true);
      expect(can(persona, "finance.read")).toBe(false);
      expect(can(persona, "settings.manage")).toBe(false);
    }
  });
});
