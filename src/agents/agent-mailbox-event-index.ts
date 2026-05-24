import { nowIso } from "../shared/time";

const EVENT_PREFIX = "mailbox:event:";
const EVENT_GC_PREFIX = "mailbox:event-gc:";
const ISO_TIMESTAMP_LENGTH = "1970-01-01T00:00:00.000Z".length;

export const MAILBOX_EVENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const MAILBOX_EVENT_CLEANUP_BATCH_SIZE = 100;

export type MailboxEventStatus = "pending" | "running" | "completed" | "failed";

export type MailboxEventState = {
  eventId: string;
  status: MailboxEventStatus;
  sequence?: number;
  attemptCount: number;
  runId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expiresAt?: string;
};

export type CleanupExpiredMailboxEventsResult = {
  scanned: number;
  deleted: number;
};

type MailboxEventIndexStore = {
  get<T = unknown>(key: string): Promise<T | undefined>;
  list<T = unknown>(options?: DurableObjectListOptions): Promise<Map<string, T>>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
};

type MailboxEventIndexReader = Pick<MailboxEventIndexStore, "get">;

type MailboxEventGcRecord = {
  eventId: string;
  expiresAt: string;
};

export async function getMailboxEventState(
  storage: MailboxEventIndexReader,
  eventId: string
): Promise<MailboxEventState | undefined> {
  return storage.get<MailboxEventState>(eventIndexKey(eventId));
}

export async function putInitialMailboxEventState(
  storage: MailboxEventIndexStore,
  params: {
    eventId: string;
    sequence: number;
    now: string;
  }
): Promise<void> {
  await storage.put(eventIndexKey(params.eventId), {
    eventId: params.eventId,
    status: "pending",
    sequence: params.sequence,
    attemptCount: 0,
    createdAt: params.now,
    updatedAt: params.now
  } satisfies MailboxEventState);
}

export async function updateMailboxEventState(
  storage: MailboxEventIndexStore,
  eventId: string,
  patch: Partial<MailboxEventState>
): Promise<void> {
  const eventKey = eventIndexKey(eventId);
  const existing = await storage.get<MailboxEventState>(eventKey);
  const now = nowIso();
  const status = patch.status ?? existing?.status ?? "pending";
  const updatedAt = patch.updatedAt ?? now;
  const expiresAt = isTerminalStatus(status)
    ? patch.expiresAt ?? existing?.expiresAt ?? retentionExpiresAt(updatedAt)
    : undefined;

  await storage.put(eventKey, {
    eventId,
    status,
    sequence: patch.sequence ?? existing?.sequence,
    attemptCount: patch.attemptCount ?? existing?.attemptCount ?? 0,
    runId: patch.runId ?? existing?.runId,
    error: patch.error,
    createdAt: existing?.createdAt ?? now,
    updatedAt,
    completedAt: patch.completedAt ?? existing?.completedAt,
    expiresAt
  } satisfies MailboxEventState);

  await updateMailboxEventGcIndex(storage, eventId, existing?.expiresAt, expiresAt);
}

export async function cleanupExpiredMailboxEvents(
  storage: DurableObjectStorage,
  nowMs = Date.now(),
  limit = MAILBOX_EVENT_CLEANUP_BATCH_SIZE
): Promise<CleanupExpiredMailboxEventsResult> {
  const cutoff = new Date(nowMs).toISOString();

  return storage.transaction(async (txn) => {
    const entries = await txn.list<MailboxEventGcRecord>({
      prefix: EVENT_GC_PREFIX,
      limit
    });
    let scanned = 0;
    let deleted = 0;

    for (const [gcKey, gcRecord] of entries) {
      const parsed = parseEventGcKey(gcKey);
      if (!parsed) {
        scanned += 1;
        await txn.delete(gcKey);
        continue;
      }

      if (parsed.expiresAt > cutoff) {
        break;
      }

      scanned += 1;
      const state = await txn.get<MailboxEventState>(
        eventIndexKey(parsed.eventId)
      );

      if (!state) {
        await txn.delete(gcKey);
        continue;
      }

      if (
        state.eventId !== gcRecord.eventId ||
        state.expiresAt !== parsed.expiresAt ||
        !isTerminalStatus(state.status)
      ) {
        await txn.delete(gcKey);
        continue;
      }

      await txn.delete(eventIndexKey(parsed.eventId));
      await txn.delete(gcKey);
      deleted += 1;
    }

    return { scanned, deleted };
  });
}

export async function getNextMailboxEventCleanupTime(
  storage: DurableObjectStorage,
  nowMs = Date.now()
): Promise<number | undefined> {
  const entries = await storage.list<MailboxEventGcRecord>({
    prefix: EVENT_GC_PREFIX,
    limit: 1
  });
  const first = entries.entries().next();
  if (first.done) {
    return undefined;
  }

  const [gcKey] = first.value;
  const parsed = parseEventGcKey(gcKey);
  if (!parsed) {
    return nowMs;
  }

  const cleanupAt = Date.parse(parsed.expiresAt);
  return Number.isFinite(cleanupAt) ? Math.max(nowMs, cleanupAt) : nowMs;
}

function updateMailboxEventGcIndex(
  storage: MailboxEventIndexStore,
  eventId: string,
  previousExpiresAt: string | undefined,
  nextExpiresAt: string | undefined
): Promise<unknown> {
  const writes: Array<Promise<unknown>> = [];

  if (previousExpiresAt && previousExpiresAt !== nextExpiresAt) {
    writes.push(storage.delete(eventGcKey(previousExpiresAt, eventId)));
  }

  if (nextExpiresAt && previousExpiresAt !== nextExpiresAt) {
    writes.push(
      storage.put(eventGcKey(nextExpiresAt, eventId), {
        eventId,
        expiresAt: nextExpiresAt
      } satisfies MailboxEventGcRecord)
    );
  }

  return Promise.all(writes);
}

function retentionExpiresAt(updatedAt: string): string {
  const updatedAtMs = Date.parse(updatedAt);
  const baseMs = Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now();
  return new Date(baseMs + MAILBOX_EVENT_RETENTION_MS).toISOString();
}

function isTerminalStatus(status: MailboxEventStatus): boolean {
  return status === "completed" || status === "failed";
}

function eventIndexKey(eventId: string): string {
  return `${EVENT_PREFIX}${eventId}`;
}

function eventGcKey(expiresAt: string, eventId: string): string {
  return `${EVENT_GC_PREFIX}${expiresAt}:${encodeURIComponent(eventId)}`;
}

function parseEventGcKey(
  key: string
): { expiresAt: string; eventId: string } | undefined {
  if (!key.startsWith(EVENT_GC_PREFIX)) {
    return undefined;
  }

  const suffix = key.slice(EVENT_GC_PREFIX.length);
  const expiresAt = suffix.slice(0, ISO_TIMESTAMP_LENGTH);
  const separator = suffix[ISO_TIMESTAMP_LENGTH];
  const encodedEventId = suffix.slice(ISO_TIMESTAMP_LENGTH + 1);
  if (expiresAt.length !== ISO_TIMESTAMP_LENGTH || separator !== ":") {
    return undefined;
  }

  try {
    return {
      expiresAt,
      eventId: decodeURIComponent(encodedEventId)
    };
  } catch {
    return undefined;
  }
}
