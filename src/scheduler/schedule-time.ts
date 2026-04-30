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
