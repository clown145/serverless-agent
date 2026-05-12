import { builtinTool } from "../builtin/source";
import type { RegisteredTool } from "../types";
import { toScheduleToolSummary } from "./format";
import { failed } from "./result";
import {
  createScheduleInputJsonSchema,
  createScheduleInputSchema,
  listSchedulesInputJsonSchema,
  listSchedulesInputSchema,
  scheduleIdInputJsonSchema,
  scheduleIdInputSchema
} from "./schema";
import {
  cancelScheduleFromTool,
  createScheduleFromTool,
  listSchedulesForTool,
  pauseScheduleFromTool,
  resumeScheduleFromTool,
  runScheduleNowFromTool
} from "./service";

export function createScheduleTools(): RegisteredTool[] {
  return [
    createScheduleTool(),
    listSchedulesTool(),
    pauseScheduleTool(),
    resumeScheduleTool(),
    cancelScheduleTool(),
    runScheduleNowTool()
  ];
}

function createScheduleTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "schedule.create",
      title: "Create Schedule",
      description: "Create a future or recurring task for the agent.",
      inputSchema: createScheduleInputJsonSchema,
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      },
      permission: {
        level: 3,
        scopes: ["schedule:write"]
      },
      sideEffect: "external_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = createScheduleInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const schedule = await createScheduleFromTool(context, parsed.data);
      return {
        status: "success",
        output: {
          schedule: toScheduleToolSummary(schedule)
        }
      };
    }
  });
}

function listSchedulesTool(): RegisteredTool {
  return builtinTool({
    definition: {
      name: "schedule.list",
      title: "List Schedules",
      description: "List future and recent schedules for the current agent.",
      inputSchema: listSchedulesInputJsonSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      },
      permission: {
        level: 1,
        scopes: ["schedule:read"]
      },
      sideEffect: "none",
      timeoutMs: 5_000
    },
    execute: async (context) => {
      const parsed = listSchedulesInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const schedules = await listSchedulesForTool(context, parsed.data);
      return {
        status: "success",
        output: {
          schedules: schedules.map((schedule) =>
            toScheduleToolSummary(schedule, { includeText: parsed.data.includeText })
          )
        }
      };
    }
  });
}

function pauseScheduleTool(): RegisteredTool {
  return scheduleMutationTool({
    name: "schedule.pause",
    title: "Pause Schedule",
    description: "Pause an active schedule.",
    execute: async (context, scheduleId) => {
      const schedule = await pauseScheduleFromTool(context, scheduleId);
      return schedule
        ? { schedule: toScheduleToolSummary(schedule) }
        : undefined;
    }
  });
}

function resumeScheduleTool(): RegisteredTool {
  return scheduleMutationTool({
    name: "schedule.resume",
    title: "Resume Schedule",
    description: "Resume a paused or failed schedule.",
    execute: async (context, scheduleId) => {
      const schedule = await resumeScheduleFromTool(context, scheduleId);
      return schedule
        ? { schedule: toScheduleToolSummary(schedule) }
        : undefined;
    }
  });
}

function cancelScheduleTool(): RegisteredTool {
  return scheduleMutationTool({
    name: "schedule.cancel",
    title: "Cancel Schedule",
    description: "Cancel a schedule so it will not fire again.",
    execute: async (context, scheduleId) => {
      const cancelled = await cancelScheduleFromTool(context, scheduleId);
      return cancelled ? { cancelled: true, scheduleId } : undefined;
    }
  });
}

function runScheduleNowTool(): RegisteredTool {
  return scheduleMutationTool({
    name: "schedule.run_now",
    title: "Run Schedule Now",
    description: "Immediately enqueue an existing schedule.",
    execute: async (context, scheduleId) => {
      const result = await runScheduleNowFromTool(context, scheduleId);
      return result
        ? {
            eventId: result.eventId,
            schedule: toScheduleToolSummary(result.schedule)
          }
        : undefined;
    }
  });
}

function scheduleMutationTool(input: {
  name: string;
  title: string;
  description: string;
  execute: (
    context: Parameters<RegisteredTool["execute"]>[0],
    scheduleId: string
  ) => Promise<Record<string, unknown> | undefined>;
}): RegisteredTool {
  return builtinTool({
    definition: {
      name: input.name,
      title: input.title,
      description: input.description,
      inputSchema: scheduleIdInputJsonSchema,
      annotations: {
        destructiveHint: input.name === "schedule.cancel",
        idempotentHint: input.name !== "schedule.run_now",
        openWorldHint: false
      },
      permission: {
        level: 3,
        scopes: ["schedule:write"]
      },
      sideEffect: "external_write",
      timeoutMs: 10_000
    },
    execute: async (context) => {
      const parsed = scheduleIdInputSchema.safeParse(context.input);
      if (!parsed.success) {
        return failed("invalid_input", parsed.error.message, false);
      }

      const output = await input.execute(context, parsed.data.scheduleId);
      if (!output) {
        return failed("schedule_not_found", "Schedule not found", false);
      }

      return { status: "success", output };
    }
  });
}
