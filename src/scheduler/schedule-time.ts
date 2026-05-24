export type DueTimeInput = {
  dueAt?: string;
  delaySeconds?: number;
};

export function resolveDueAt(now: Date, input: DueTimeInput): string {
  if (input.dueAt) {
    return new Date(input.dueAt).toISOString();
  }

  if (input.delaySeconds !== undefined) {
    return new Date(now.getTime() + input.delaySeconds * 1000).toISOString();
  }

  throw new Error("Either dueAt or delaySeconds is required");
}

export function computeNextDueAt(now: Date, intervalSeconds: number): string {
  return new Date(now.getTime() + intervalSeconds * 1000).toISOString();
}

export function computeNextRecurringDueAt(
  previousDueAt: Date,
  intervalSeconds: number,
  after: Date
): string {
  const intervalMs = intervalSeconds * 1000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Interval seconds must be positive");
  }

  const previousMs = previousDueAt.getTime();
  const afterMs = after.getTime();
  if (!Number.isFinite(previousMs) || !Number.isFinite(afterMs)) {
    throw new Error("Invalid schedule time");
  }

  const missedIntervals = Math.max(1, Math.floor((afterMs - previousMs) / intervalMs) + 1);
  return new Date(previousMs + missedIntervals * intervalMs).toISOString();
}
