import { describe, expect, it } from "vitest";
import { computeNextDueAt, resolveDueAt } from "../../src/scheduler/schedule-time";

describe("schedule time", () => {
  const now = new Date("2026-04-30T00:00:00.000Z");

  it("resolves delay seconds", () => {
    expect(resolveDueAt(now, { delaySeconds: 60 })).toBe(
      "2026-04-30T00:01:00.000Z"
    );
  });

  it("uses explicit dueAt", () => {
    expect(resolveDueAt(now, { dueAt: "2026-05-01T00:00:00.000Z" })).toBe(
      "2026-05-01T00:00:00.000Z"
    );
  });

  it("computes next interval", () => {
    expect(computeNextDueAt(now, 300)).toBe("2026-04-30T00:05:00.000Z");
  });
});
