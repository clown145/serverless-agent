import { describe, expect, it } from "vitest";
import { sweepDueSchedules } from "../../src/scheduler/schedule-sweeper";
import type { Env } from "../../src/shared/types/env";
import type { QueueMessageBody } from "../../src/shared/types/queue";
import type { ScheduleRow } from "../../src/storage/repositories/schedule-types";

describe("schedule sweeper", () => {
  it("dispatches due schedules across multiple pages", async () => {
    const db = createScheduleDb([
      scheduleRow("sch_1", "2026-05-01T00:00:00.000Z"),
      scheduleRow("sch_2", "2026-05-01T00:01:00.000Z"),
      scheduleRow("sch_3", "2026-05-01T00:02:00.000Z")
    ]);
    const sent: QueueMessageBody[] = [];

    const result = await sweepDueSchedules(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: createQueue(sent),
        SCHEDULE_SWEEP_BATCH_SIZE: "2",
        SCHEDULE_SWEEP_MAX_DISPATCHES: "3"
      } as Env,
      "2026-05-01T00:05:00.000Z"
    );

    expect(result.dispatched).toBe(3);
    expect(result.remainingDue).toBe(0);
    expect(sent.map((message) => message.type)).toEqual([
      "schedule.fire",
      "schedule.fire",
      "schedule.fire"
    ]);
    expect(db.heartbeat?.status).toBe("ok");
  });

  it("reports remaining due work when max dispatches is reached", async () => {
    const db = createScheduleDb([
      scheduleRow("sch_1", "2026-05-01T00:00:00.000Z"),
      scheduleRow("sch_2", "2026-05-01T00:01:00.000Z"),
      scheduleRow("sch_3", "2026-05-01T00:02:00.000Z")
    ]);
    const sent: QueueMessageBody[] = [];

    const result = await sweepDueSchedules(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: createQueue(sent),
        SCHEDULE_SWEEP_BATCH_SIZE: "2",
        SCHEDULE_SWEEP_MAX_DISPATCHES: "2"
      } as Env,
      "2026-05-01T00:05:00.000Z"
    );

    expect(result.dispatched).toBe(2);
    expect(result.remainingDue).toBe(1);
    expect(db.heartbeat?.status).toBe("degraded");
  });

  it("advances recurring schedules on the original time axis", async () => {
    const db = createScheduleDb([
      scheduleRow("sch_1", "2026-05-01T00:00:00.000Z", {
        interval_seconds: 300,
        recurrence_due_at: "2026-05-01T00:00:00.000Z"
      })
    ]);

    await sweepDueSchedules(
      {
        AGENT_DB: db as unknown as D1Database,
        AGENT_QUEUE: createQueue([])
      } as Env,
      "2026-05-01T00:07:00.000Z"
    );

    expect(db.rows.get("sch_1")?.due_at).toBe("2026-05-01T00:10:00.000Z");
    expect(db.rows.get("sch_1")?.recurrence_due_at).toBe("2026-05-01T00:10:00.000Z");
  });
});

function createScheduleDb(initialRows: ScheduleRow[]) {
  const rows = new Map(initialRows.map((row) => [row.id, { ...row }]));
  const db = {
    rows,
    heartbeat: undefined as { status: string; detailsJson: string | null } | undefined,
    prepare(sql: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async all<T>() {
          if (sql.includes("FROM schedules")) {
            const dueAtOrBefore = statement.values[0] as string;
            const limit = statement.values[1] as number;
            const due = [...rows.values()]
              .filter((row) => row.status === "active" && row.due_at <= dueAtOrBefore)
              .sort((left, right) => left.due_at.localeCompare(right.due_at))
              .slice(0, limit);
            return { results: due as T[] };
          }

          return { results: [] as T[] };
        },
        async first<T>() {
          if (sql.includes("COUNT(*)")) {
            const dueAtOrBefore = statement.values[0] as string;
            const count = [...rows.values()].filter(
              (row) => row.status === "active" && row.due_at <= dueAtOrBefore
            ).length;
            return { count } as T;
          }

          return undefined;
        },
        async run() {
          if (sql.includes("UPDATE schedules")) {
            const id = statement.values[6] as string;
            const row = rows.get(id);
            if (row) {
              row.status = statement.values[0] as ScheduleRow["status"];
              row.due_at = statement.values[1] as string;
              row.recurrence_due_at = statement.values[2] as string | null;
              row.last_run_at = statement.values[3] as string;
              row.attempt_count = statement.values[4] as number;
              row.updated_at = statement.values[5] as string;
            }
          }

          if (sql.includes("INSERT INTO heartbeats")) {
            db.heartbeat = {
              status: statement.values[3] as string,
              detailsJson: statement.values[6] as string | null
            };
          }

          return { meta: { changes: 1 } };
        }
      };

      return statement;
    }
  };

  return db;
}

function createQueue(sent: QueueMessageBody[]): Queue<QueueMessageBody> {
  return {
    async send(message: QueueMessageBody) {
      sent.push(message);
    }
  } as unknown as Queue<QueueMessageBody>;
}

function scheduleRow(id: string, dueAt: string, overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id,
    agent_id: "default",
    status: "active",
    title: "Task",
    due_at: dueAt,
    interval_seconds: undefined,
    platform: "webui",
    conversation_id: "webui:default",
    actor_id: "scheduler",
    actor_role: "owner",
    model_provider_id: null,
    model_id: null,
    max_attempts: 1,
    attempt_count: 0,
    retry_delay_seconds: 300,
    recurrence_due_at: null,
    payload_json: JSON.stringify({ text: "Task" }),
    execution_profile_json: null,
    last_run_at: null,
    last_error: null,
    last_run_id: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides
  };
}
