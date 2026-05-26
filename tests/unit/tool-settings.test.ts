import { describe, expect, it } from "vitest";
import {
  getToolSettings,
  setToolSettings
} from "../../src/storage/repositories/tool-settings-repository";
import {
  DEFAULT_MAX_TOOL_CALLS_PER_RUN,
  mapToolSettingsRow,
  type ToolSettingsRow
} from "../../src/storage/repositories/tool-settings-types";
import { updateToolSettingsSchema } from "../../src/worker/routes/tools/tool-settings-schemas";

describe("tool settings", () => {
  it("returns defaults when no settings row exists", async () => {
    const db = createToolSettingsDb();

    await expect(getToolSettings(db, "agent-1")).resolves.toMatchObject({
      agentId: "agent-1",
      maxToolCallsPerRun: DEFAULT_MAX_TOOL_CALLS_PER_RUN
    });
  });

  it("persists max tool calls per run with an upsert", async () => {
    const db = createToolSettingsDb();

    await expect(
      setToolSettings(db, {
        agentId: "agent-1",
        maxToolCallsPerRun: 12
      })
    ).resolves.toMatchObject({
      agentId: "agent-1",
      maxToolCallsPerRun: 12
    });
    expect(db.row).toMatchObject({
      agent_id: "agent-1",
      max_tool_calls_per_run: 12
    });
    expect(db.upsertSql).toContain("ON CONFLICT(agent_id) DO UPDATE");
  });

  it("defaults old rows to the configured default", () => {
    expect(mapToolSettingsRow({ agent_id: "agent-1" })).toMatchObject({
      maxToolCallsPerRun: DEFAULT_MAX_TOOL_CALLS_PER_RUN
    });
  });

  it("coerces and clamps max tool call updates", () => {
    expect(updateToolSettingsSchema.parse({ maxToolCallsPerRun: "3" })).toEqual({
      maxToolCallsPerRun: 3
    });
    expect(() => updateToolSettingsSchema.parse({ maxToolCallsPerRun: 0 })).toThrow();
    expect(() => updateToolSettingsSchema.parse({ maxToolCallsPerRun: 101 })).toThrow();
  });
});

function createToolSettingsDb(
  initialRow?: ToolSettingsRow
): D1Database & { row?: ToolSettingsRow; upsertSql?: string } {
  const db = {
    row: initialRow,
    upsertSql: undefined as string | undefined,
    prepare(sql: string) {
      if (sql.includes("SELECT * FROM tool_settings")) {
        return {
          bind: () => ({
            first: async () => db.row ?? null
          })
        };
      }

      if (sql.includes("INSERT INTO tool_settings")) {
        db.upsertSql = sql;
        return {
          bind(agentId: string, maxToolCallsPerRun: number, updatedAt: string) {
            return {
              async run() {
                db.row = {
                  agent_id: agentId,
                  max_tool_calls_per_run: maxToolCallsPerRun,
                  updated_at: updatedAt
                };
                return { success: true, meta: { changes: 1 } } as D1Result;
              }
            };
          }
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  return db as unknown as D1Database & { row?: ToolSettingsRow; upsertSql?: string };
}
