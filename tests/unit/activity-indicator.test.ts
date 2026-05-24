import { afterEach, describe, expect, it, vi } from "vitest";
import { runWithActivityPulse } from "../../src/core/activity-indicator";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("activity indicator", () => {
  it("sends activity immediately and repeats until the task finishes", async () => {
    vi.useFakeTimers();
    const sendActivity = vi.fn(async () => undefined);
    let finishTask: (value: string) => void = () => undefined;
    const taskResult = new Promise<string>((resolve) => {
      finishTask = resolve;
    });

    const run = runWithActivityPulse(sendActivity, async () => taskResult, {
      intervalMs: 4_000,
      maxPulses: 5
    });

    await vi.waitFor(() => {
      expect(sendActivity).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(4_000);
    expect(sendActivity).toHaveBeenCalledTimes(2);

    finishTask("done");
    await expect(run).resolves.toBe("done");

    await vi.advanceTimersByTimeAsync(8_000);
    expect(sendActivity).toHaveBeenCalledTimes(2);
  });

  it("stops activity after the maximum pulse count", async () => {
    vi.useFakeTimers();
    const sendActivity = vi.fn(async () => undefined);
    let finishTask: (value: string) => void = () => undefined;
    const taskResult = new Promise<string>((resolve) => {
      finishTask = resolve;
    });

    const run = runWithActivityPulse(sendActivity, async () => taskResult, {
      intervalMs: 1_000,
      maxPulses: 3
    });

    await vi.waitFor(() => {
      expect(sendActivity).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sendActivity).toHaveBeenCalledTimes(3);

    finishTask("done");
    await expect(run).resolves.toBe("done");
  });
});
