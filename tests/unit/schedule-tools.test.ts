import { describe, expect, it, vi } from "vitest";
import { createScheduleTools } from "../../src/tools/schedule/tools";
import type { ScheduleRow } from "../../src/storage/repositories/schedule-types";
import type { ToolExecutionContext } from "../../src/tools/types";

describe("schedule tools", () => {
  it("creates a schedule from the current actor context", async () => {
    const db = createMockD1();
    const tool = findTool("schedule.create");
    const result = await tool.execute(
      createContext(db, {
        actorId: "telegram:789",
        actorRole: "owner",
        platform: "telegram",
        conversationId: "telegram:789",
        input: {
          title: "Check status",
          text: "检查一次项目状态",
          delaySeconds: 60,
          maxAttempts: 2
        }
      })
    );

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      schedule: {
        title: "Check status",
        platform: "telegram",
        conversationId: "telegram:789",
        maxAttempts: 2,
        text: "检查一次项目状态"
      }
    });

    expect(db.inserted[0]).toMatchObject({
      agent_id: "default",
      title: "Check status",
      platform: "telegram",
      conversation_id: "telegram:789",
      actor_id: "telegram:789",
      actor_role: "owner",
      max_attempts: 2
    });
  });

  it("lists current agent schedules and can hide text", async () => {
    const db = createMockD1([
      scheduleRow({
        id: "sch_active",
        status: "active",
        agent_id: "default",
        payload_json: JSON.stringify({ text: "visible" })
      }),
      scheduleRow({
        id: "sch_paused",
        status: "paused",
        agent_id: "default",
        payload_json: JSON.stringify({ text: "hidden" })
      })
    ]);
    const tool = findTool("schedule.list");
    const result = await tool.execute(
      createContext(db, {
        input: {
          statuses: ["active"],
          includeText: false,
          limit: 10
        }
      })
    );

    expect(result.status).toBe("success");
    expect(result.output).toEqual({
      schedules: [
        expect.objectContaining({
          id: "sch_active",
          status: "active",
          text: undefined
        })
      ]
    });
  });

  it("enqueues run_now for a schedule owned by the current agent", async () => {
    const queue = { send: vi.fn(async () => undefined) };
    const db = createMockD1([
      scheduleRow({
        id: "sch_run",
        agent_id: "default",
        payload_json: JSON.stringify({ text: "run it" })
      })
    ]);
    const tool = findTool("schedule.run_now");
    const result = await tool.execute(
      createContext(db, {
        env: { AGENT_QUEUE: queue },
        input: {
          scheduleId: "sch_run"
        }
      })
    );

    expect(result.status).toBe("success");
    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "schedule.fire",
        scheduleId: "sch_run",
        text: "run it"
      })
    );
  });

  it("does not mutate schedules owned by another agent", async () => {
    const db = createMockD1([
      scheduleRow({
        id: "sch_other",
        agent_id: "other"
      })
    ]);
    const tool = findTool("schedule.cancel");
    const result = await tool.execute(
      createContext(db, {
        input: {
          scheduleId: "sch_other"
        }
      })
    );

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "schedule_not_found"
      }
    });
    expect(db.cancelled).toEqual([]);
  });
});

function findTool(name: string) {
  const tool = createScheduleTools().find((item) => item.definition.name === name);
  if (!tool) {
    throw new Error(`Missing tool ${name}`);
  }

  return tool;
}

function createContext(
  db: ReturnType<typeof createMockD1>,
  overrides: TestContextOverrides = {}
): ToolExecutionContext {
  const { env: envOverrides, ...contextOverrides } = overrides;

  return {
    env: {
      AGENT_DB: db as unknown as D1Database,
      AGENT_QUEUE: {
        send: vi.fn(async () => undefined)
      },
      ...(envOverrides ?? {})
    } as unknown as ToolExecutionContext["env"],
    agentId: "default",
    actorId: "user:1",
    actorRole: "owner",
    platform: "webui",
    conversationId: "webui:default",
    runId: "run",
    stepId: "step",
    input: {},
    ...contextOverrides
  };
}

type TestContextOverrides = Omit<Partial<ToolExecutionContext>, "env"> & {
  env?: Record<string, unknown>;
};

function createMockD1(initialRows: ScheduleRow[] = []) {
  const rows = new Map(initialRows.map((row) => [row.id, { ...row }]));
  const db = {
    inserted: [] as ScheduleRow[],
    cancelled: [] as string[],
    prepare(sql: string) {
      const statement = {
        values: [] as unknown[],
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        },
        async run() {
          if (sql.includes("INSERT INTO schedules")) {
            const row = scheduleRow({
              id: statement.values[0] as string,
              agent_id: statement.values[1] as string,
              status: "active",
              title: statement.values[2] as string | null,
              due_at: statement.values[3] as string,
              interval_seconds: (statement.values[4] ?? undefined) as number | undefined,
              platform: statement.values[5] as ScheduleRow["platform"],
              conversation_id: statement.values[6] as string | null,
              actor_id: statement.values[7] as string | null,
              actor_role: statement.values[8] as ScheduleRow["actor_role"],
              model_provider_id: statement.values[9] as string | null,
              model_id: statement.values[10] as string | null,
              max_attempts: statement.values[11] as number,
              attempt_count: 0,
              retry_delay_seconds: statement.values[12] as number,
              recurrence_due_at: statement.values[13] as string | null,
              payload_json: statement.values[14] as string,
              execution_profile_json: statement.values[15] as string | null,
              created_at: statement.values[16] as string,
              updated_at: statement.values[17] as string
            });
            rows.set(row.id, row);
            db.inserted.push(row);
            return { meta: { changes: 1 } };
          }

          if (sql.includes("SET last_run_at")) {
            const id = statement.values[2] as string;
            const row = rows.get(id);
            if (row && row.status !== "cancelled") {
              row.last_run_at = statement.values[0] as string;
              row.updated_at = statement.values[1] as string;
              row.attempt_count = (row.attempt_count ?? 0) + 1;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }

          if (sql.includes("SET status = 'cancelled'")) {
            const id = statement.values[1] as string;
            const row = rows.get(id);
            if (row && row.status !== "cancelled") {
              row.status = "cancelled";
              row.updated_at = statement.values[0] as string;
              db.cancelled.push(id);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }

          if (sql.includes("SET status = 'paused'")) {
            const row = rows.get(statement.values[1] as string);
            if (row && row.status === "active") {
              row.status = "paused";
              row.updated_at = statement.values[0] as string;
            }
            return { meta: { changes: row ? 1 : 0 } };
          }

          if (sql.includes("SET status = 'active'")) {
            const row = rows.get(statement.values[1] as string);
            if (row && (row.status === "paused" || row.status === "failed")) {
              row.status = "active";
              row.attempt_count = 0;
              row.last_error = null;
              row.updated_at = statement.values[0] as string;
            }
            return { meta: { changes: row ? 1 : 0 } };
          }

          return { meta: { changes: 0 } };
        },
        async all() {
          if (sql.includes("WHERE agent_id = ?")) {
            const agentId = statement.values[0] as string;
            return {
              results: Array.from(rows.values()).filter((row) => row.agent_id === agentId)
            };
          }

          return { results: Array.from(rows.values()) };
        },
        async first() {
          return rows.get(statement.values[0] as string) ?? null;
        }
      };

      return statement;
    }
  };

  return db;
}

function scheduleRow(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: "sch_1",
    agent_id: "default",
    status: "active",
    title: "Task",
    due_at: "2026-05-12T12:00:00.000Z",
    interval_seconds: undefined,
    platform: "webui",
    conversation_id: "webui:default",
    actor_id: "user:1",
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
    created_at: "2026-05-12T00:00:00.000Z",
    updated_at: "2026-05-12T00:00:00.000Z",
    ...overrides
  };
}
