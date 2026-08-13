import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns an Error message", () => {
    expect(getErrorMessage(new Error("failure"), "fallback")).toBe("failure");
  });

  it("returns a string error", () => {
    expect(getErrorMessage("failure", "fallback")).toBe("failure");
  });

  it("reads message from an unknown object", () => {
    expect(getErrorMessage({ message: "failure" }, "fallback")).toBe("failure");
  });

  it("uses the fallback for invalid values", () => {
    expect(getErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
  });
});
