import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeTools } from "../../src/tools/time/tools";

const tool = createTimeTools().find((candidate) => candidate.definition.name === "time.now");

afterEach(() => {
  vi.useRealTimers();
});

describe("time tools", () => {
  it("returns current time in the requested timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T12:34:56.000Z"));

    const result = await tool?.execute({
      env: { AGENT_TIMEZONE: "UTC" } as Parameters<NonNullable<typeof tool>["execute"]>[0]["env"],
      agentId: "default",
      actorId: "user",
      runId: "run_1",
      stepId: "step_1",
      input: {
        timeZone: "Asia/Shanghai"
      }
    });

    expect(result).toMatchObject({
      status: "success",
      output: {
        iso: "2026-05-25T12:34:56.000Z",
        unixSeconds: 1_779_712_496,
        timeZone: "Asia/Shanghai"
      }
    });
  });

  it("rejects invalid timezones", async () => {
    const result = await tool?.execute({
      env: { AGENT_TIMEZONE: "UTC" } as Parameters<NonNullable<typeof tool>["execute"]>[0]["env"],
      agentId: "default",
      actorId: "user",
      runId: "run_1",
      stepId: "step_1",
      input: {
        timeZone: "Mars/Base"
      }
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "invalid_timezone"
      }
    });
  });

  it("falls back to UTC when no timezone is configured", async () => {
    const result = await tool?.execute({
      env: { AGENT_TIMEZONE: "" } as Parameters<NonNullable<typeof tool>["execute"]>[0]["env"],
      agentId: "default",
      actorId: "user",
      runId: "run_1",
      stepId: "step_1",
      input: {}
    });

    expect(result).toMatchObject({
      status: "success",
      output: {
        timeZone: "UTC"
      }
    });
  });
});
