import { describe, expect, it } from "vitest";
import { fromLocalInput, localDateTime, toLocalInput } from "./datetime";

describe("event-time conversion (Europe/Amsterdam)", () => {
  it("handles winter and summer time", () => {
    expect(fromLocalInput("2027-03-17T10:30").toISOString()).toBe("2027-03-17T09:30:00.000Z");
    expect(fromLocalInput("2027-07-01T10:30").toISOString()).toBe("2027-07-01T08:30:00.000Z");
  });

  it("round-trips", () => {
    expect(toLocalInput(new Date("2027-03-17T09:30:00Z"))).toBe("2027-03-17T10:30");
    expect(toLocalInput(null)).toBe("");
  });

  it("rejects malformed input", () => {
    expect(localDateTime.safeParse("2027-13-45T10:30").success).toBe(false);
    expect(localDateTime.safeParse("tomorrow").success).toBe(false);
  });
});
