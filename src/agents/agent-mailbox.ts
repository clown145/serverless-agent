import { nowIso } from "../shared/time";
import type { QueueMessageBody } from "../shared/types/queue";
import type { AgentEventResult } from "./agent-event-handler";
import {
  MAILBOX_EVENT_RETENTION_MS,
  cleanupExpiredMailboxEvents,
  getMailboxEventState as getMailboxEventStateFromIndex,
  getNextMailboxEventCleanupTime,
  putInitialMailboxEventState,
  updateMailboxEventState,
  type CleanupExpiredMailboxEventsResult,
  type MailboxEventState,
  type MailboxEventStatus
} from "./agent-mailbox-event-index";

const META_KEY = "mailbox:meta";
const RUNNING_KEY = "mailbox:running";
const PENDING_PREFIX = "mailbox:pending:";
const SEQUENCE_WIDTH = 20;

export const MAILBOX_RECOVERY_ALARM_DELAY_MS = 60_000;
export const MAILBOX_RUNNING_LEASE_MS = 60_000;
export const MAILBOX_RUNNING_STALE_MS = 30 * 60 * 1000;
export const MAILBOX_MAX_ATTEMPTS = 3;
export { MAILBOX_EVENT_RETENTION_MS, cleanupExpiredMailboxEvents };
export type { MailboxEventState, MailboxEventStatus };
export type { CleanupExpiredMailboxEventsResult };

type MailboxMeta = {
  nextSequence: number;
};

export type MailboxEventRecord = {
  sequence: number;
  event: QueueMessageBody;
  enqueuedAt: string;
  attemptCount: number;
};

export type RunningMailboxEvent = MailboxEventRecord & {
  startedAt: string;
  ownerInstanceId?: string;
  leaseExpiresAt?: string;
};

export type MailboxClaimOptions = {
  ownerInstanceId?: string;
  leaseMs?: number;
  nowMs?: number;
};

export type MailboxRecoveryOptions = MailboxClaimOptions;

export type EnqueueMailboxResult = {
  accepted: boolean;
  duplicate: boolean;
  status: MailboxEventStatus;
  eventId: string;
  sequence?: number;
};

export async function enqueueMailboxEvent(
  storage: DurableObjectStorage,
  event: QueueMessageBody
): Promise<EnqueueMailboxResult> {
  const now = nowIso();

  return storage.transaction(async (txn) => {
    const existing = await getMailboxEventStateFromIndex(txn, event.eventId);
    if (existing) {
      return {
        accepted: false,
        duplicate: true,
        status: existing.status,
        eventId: event.eventId,
        sequence: existing.sequence
      };
    }

    const meta = (await txn.get<MailboxMeta>(META_KEY)) ?? { nextSequence: 1 };
    const sequence = meta.nextSequence;
    const record: MailboxEventRecord = {
      sequence,
      event,
      enqueuedAt: now,
      attemptCount: 0
    };

    await txn.put(pendingKey(sequence), record);
    await txn.put(META_KEY, { nextSequence: sequence + 1 } satisfies MailboxMeta);
    await putInitialMailboxEventState(txn, {
      eventId: event.eventId,
      sequence,
      now
    });

    return {
      accepted: true,
      duplicate: false,
      status: "pending" as const,
      eventId: event.eventId,
      sequence
    };
  });
}

export async function recoverStaleRunningEvent(
  storage: DurableObjectStorage,
  optionsOrNowMs: MailboxRecoveryOptions | number = {}
): Promise<"none" | "active" | "requeued" | "failed"> {
  const options = normalizeRecoveryOptions(optionsOrNowMs);
  const nowMs = options.nowMs ?? Date.now();
  const now = isoFromMs(nowMs);

  return storage.transaction(async (txn) => {
    const running = await txn.get<RunningMailboxEvent>(RUNNING_KEY);
    if (!running) {
      return "none";
    }

    if (!shouldRecoverRunningEvent(running, options, nowMs)) {
      return "active";
    }

    if (running.attemptCount >= MAILBOX_MAX_ATTEMPTS) {
      await txn.delete(RUNNING_KEY);
      await updateMailboxEventState(txn, running.event.eventId, {
        status: "failed",
        attemptCount: running.attemptCount,
        error: "Mailbox event exceeded retry attempts after stale running recovery",
        updatedAt: now,
        completedAt: now
      });
      return "failed";
    }

    const record: MailboxEventRecord = {
      sequence: running.sequence,
      event: running.event,
      enqueuedAt: now,
      attemptCount: running.attemptCount
    };

    await txn.put(pendingKey(running.sequence), record);
    await txn.delete(RUNNING_KEY);
    await updateMailboxEventState(txn, running.event.eventId, {
      status: "pending",
      sequence: running.sequence,
      attemptCount: running.attemptCount,
      error: "Recovered stale running mailbox event",
      updatedAt: now
    });

    return "requeued";
  });
}

export async function claimNextMailboxEvent(
  storage: DurableObjectStorage,
  options: MailboxClaimOptions = {}
): Promise<RunningMailboxEvent | undefined> {
  const nowMs = options.nowMs ?? Date.now();
  const now = isoFromMs(nowMs);
  const leaseMs = options.leaseMs ?? MAILBOX_RUNNING_LEASE_MS;

  return storage.transaction(async (txn) => {
    const running = await txn.get<RunningMailboxEvent>(RUNNING_KEY);
    if (running) {
      return undefined;
    }

    const pending = await txn.list<MailboxEventRecord>({
      prefix: PENDING_PREFIX,
      limit: 1
    });
    const first = pending.entries().next();
    if (first.done) {
      return undefined;
    }

    const [key, record] = first.value;
    const runningRecord: RunningMailboxEvent = {
      ...record,
      attemptCount: record.attemptCount + 1,
      startedAt: now,
      ownerInstanceId: options.ownerInstanceId,
      leaseExpiresAt: isoFromMs(nowMs + leaseMs)
    };

    await txn.delete(key);
    await txn.put(RUNNING_KEY, runningRecord);
    await updateMailboxEventState(txn, record.event.eventId, {
      status: "running",
      sequence: record.sequence,
      attemptCount: runningRecord.attemptCount,
      error: undefined,
      updatedAt: now
    });

    return runningRecord;
  });
}

export async function completeMailboxEvent(
  storage: DurableObjectStorage,
  running: RunningMailboxEvent,
  result: AgentEventResult
): Promise<void> {
  const now = nowIso();

  await storage.transaction(async (txn) => {
    const current = await txn.get<RunningMailboxEvent>(RUNNING_KEY);
    if (!isSameRunningAttempt(current, running)) {
      return;
    }

    await txn.delete(RUNNING_KEY);
    await updateMailboxEventState(txn, running.event.eventId, {
      status: "completed",
      sequence: running.sequence,
      attemptCount: running.attemptCount,
      runId: result.runId,
      error: undefined,
      updatedAt: now,
      completedAt: now
    });
  });
}

export async function failMailboxEvent(
  storage: DurableObjectStorage,
  running: RunningMailboxEvent,
  error: unknown
): Promise<void> {
  const now = nowIso();
  const message = error instanceof Error ? error.message : String(error);

  await storage.transaction(async (txn) => {
    const current = await txn.get<RunningMailboxEvent>(RUNNING_KEY);
    if (!isSameRunningAttempt(current, running)) {
      return;
    }

    await txn.delete(RUNNING_KEY);

    if (running.attemptCount >= MAILBOX_MAX_ATTEMPTS) {
      await updateMailboxEventState(txn, running.event.eventId, {
        status: "failed",
        sequence: running.sequence,
        attemptCount: running.attemptCount,
        error: message,
        updatedAt: now,
        completedAt: now
      });
      return;
    }

    const retryRecord: MailboxEventRecord = {
      sequence: running.sequence,
      event: running.event,
      enqueuedAt: now,
      attemptCount: running.attemptCount
    };

    await txn.put(pendingKey(running.sequence), retryRecord);
    await updateMailboxEventState(txn, running.event.eventId, {
      status: "pending",
      sequence: running.sequence,
      attemptCount: running.attemptCount,
      error: message,
      updatedAt: now
    });
  });
}

export async function getNextMailboxAlarmTime(
  storage: DurableObjectStorage,
  nowMs = Date.now()
): Promise<number | undefined> {
  const workAlarmTime = await getNextMailboxWorkAlarmTime(storage, nowMs);
  const cleanupAlarmTime = await getNextMailboxEventCleanupTime(storage, nowMs);

  if (workAlarmTime === undefined) {
    return cleanupAlarmTime;
  }
  if (cleanupAlarmTime === undefined) {
    return workAlarmTime;
  }

  return Math.min(workAlarmTime, cleanupAlarmTime);
}

async function getNextMailboxWorkAlarmTime(
  storage: DurableObjectStorage,
  nowMs: number
): Promise<number | undefined> {
  const pending = await storage.list<MailboxEventRecord>({
    prefix: PENDING_PREFIX,
    limit: 1
  });
  if (pending.size > 0) {
    return nowMs + MAILBOX_RECOVERY_ALARM_DELAY_MS;
  }

  const running = await storage.get<RunningMailboxEvent>(RUNNING_KEY);
  if (!running) {
    return undefined;
  }

  const startedAtMs = Date.parse(running.startedAt);
  const leaseExpiresAtMs = getRunningLeaseExpiresAtMs(running);
  const hardStaleAtMs = Number.isFinite(startedAtMs)
    ? startedAtMs + MAILBOX_RUNNING_STALE_MS
    : undefined;
  const recoveryAtMs = minFinite(leaseExpiresAtMs, hardStaleAtMs);

  if (recoveryAtMs === undefined) {
    return nowMs + MAILBOX_RECOVERY_ALARM_DELAY_MS;
  }

  return Math.max(nowMs + MAILBOX_RECOVERY_ALARM_DELAY_MS, recoveryAtMs);
}

export async function getMailboxEventState(
  storage: DurableObjectStorage,
  eventId: string
): Promise<MailboxEventState | undefined> {
  return getMailboxEventStateFromIndex(storage, eventId);
}

export async function hasMailboxWork(storage: DurableObjectStorage): Promise<boolean> {
  const running = await storage.get<RunningMailboxEvent>(RUNNING_KEY);
  if (running) {
    return true;
  }

  const pending = await storage.list<MailboxEventRecord>({
    prefix: PENDING_PREFIX,
    limit: 1
  });
  return pending.size > 0;
}

function pendingKey(sequence: number): string {
  return `${PENDING_PREFIX}${String(sequence).padStart(SEQUENCE_WIDTH, "0")}`;
}

function normalizeRecoveryOptions(
  optionsOrNowMs: MailboxRecoveryOptions | number
): MailboxRecoveryOptions {
  return typeof optionsOrNowMs === "number" ? { nowMs: optionsOrNowMs } : optionsOrNowMs;
}

function shouldRecoverRunningEvent(
  running: RunningMailboxEvent,
  options: MailboxRecoveryOptions,
  nowMs: number
): boolean {
  if (
    running.ownerInstanceId &&
    options.ownerInstanceId &&
    running.ownerInstanceId !== options.ownerInstanceId
  ) {
    return true;
  }

  const startedAtMs = Date.parse(running.startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return true;
  }

  if (nowMs - startedAtMs >= MAILBOX_RUNNING_STALE_MS) {
    return true;
  }

  const leaseExpiresAtMs = getRunningLeaseExpiresAtMs(running, options.leaseMs);
  return leaseExpiresAtMs !== undefined && nowMs >= leaseExpiresAtMs;
}

function getRunningLeaseExpiresAtMs(
  running: RunningMailboxEvent,
  fallbackLeaseMs = MAILBOX_RUNNING_LEASE_MS
): number | undefined {
  const explicitLeaseMs = Date.parse(running.leaseExpiresAt ?? "");
  if (Number.isFinite(explicitLeaseMs)) {
    return explicitLeaseMs;
  }

  const startedAtMs = Date.parse(running.startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return undefined;
  }

  return startedAtMs + fallbackLeaseMs;
}

function isSameRunningAttempt(
  current: RunningMailboxEvent | undefined,
  expected: RunningMailboxEvent
): boolean {
  return (
    current?.event.eventId === expected.event.eventId &&
    current.sequence === expected.sequence &&
    current.attemptCount === expected.attemptCount &&
    current.startedAt === expected.startedAt &&
    current.ownerInstanceId === expected.ownerInstanceId
  );
}

function minFinite(...values: Array<number | undefined>): number | undefined {
  const finite = values.filter((value): value is number => Number.isFinite(value));
  return finite.length > 0 ? Math.min(...finite) : undefined;
}

function isoFromMs(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}
