import { z } from "zod";
import {
  MAX_TOOL_CALLS_PER_RUN_LIMIT,
  MIN_MAX_TOOL_CALLS_PER_RUN
} from "../../../storage/repositories/tool-settings-types";

export const updateToolSettingsSchema = z.object({
  agentId: z.string().min(1).optional(),
  maxToolCallsPerRun: z.coerce
    .number()
    .int()
    .min(MIN_MAX_TOOL_CALLS_PER_RUN)
    .max(MAX_TOOL_CALLS_PER_RUN_LIMIT)
});

export function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? error.message;
}
