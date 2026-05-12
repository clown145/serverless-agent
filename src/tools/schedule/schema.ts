import { z } from "zod";

export const scheduleStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "cancelled",
  "failed"
]);

export const platformSchema = z.enum(["telegram", "qq", "webhook", "admin", "webui"]);
export const actorRoleSchema = z.enum(["owner", "admin", "member", "unknown"]);

const dueAtSchema = z
  .string()
  .min(1)
  .refine((value) => Number.isFinite(new Date(value).getTime()), {
    message: "dueAt must be a valid ISO 8601 date-time"
  });

export const createScheduleInputSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    text: z.string().min(1).max(8000),
    dueAt: dueAtSchema.optional(),
    delaySeconds: z.number().int().min(0).max(31_536_000).optional(),
    intervalSeconds: z.number().int().min(300).max(31_536_000).optional(),
    platform: platformSchema.optional(),
    conversationId: z.string().min(1).max(256).optional(),
    modelProviderId: z.string().min(1).optional(),
    modelId: z.string().min(1).optional(),
    maxAttempts: z.number().int().min(1).max(10).optional(),
    retryDelaySeconds: z.number().int().min(60).max(86_400).optional()
  })
  .refine((value) => value.dueAt || value.delaySeconds !== undefined, {
    message: "Either dueAt or delaySeconds is required"
  })
  .refine((value) => Boolean(value.modelProviderId) === Boolean(value.modelId), {
    message: "modelProviderId and modelId must be provided together"
  });

export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;

export const listSchedulesInputSchema = z.object({
  statuses: z.array(scheduleStatusSchema).max(5).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  includeText: z.boolean().default(true)
});

export type ListSchedulesInput = z.infer<typeof listSchedulesInputSchema>;

export const scheduleIdInputSchema = z.object({
  scheduleId: z.string().min(1)
});

export type ScheduleIdInput = z.infer<typeof scheduleIdInputSchema>;

const platformProperty = {
  type: "string",
  enum: ["telegram", "qq", "webhook", "admin", "webui"],
  description: "Target platform. Defaults to the current message platform."
} as const;

const modelProviderProperty = {
  type: "string",
  description: "Optional model provider id. Must be provided with modelId."
} as const;

const modelIdProperty = {
  type: "string",
  description: "Optional model id. Must be provided with modelProviderId."
} as const;

export const createScheduleInputJsonSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      maxLength: 120,
      description: "Short task title."
    },
    text: {
      type: "string",
      maxLength: 8000,
      description: "Message text the agent should process when the schedule fires."
    },
    dueAt: {
      type: "string",
      format: "date-time",
      description: "Absolute ISO 8601 due time. Offset forms such as +08:00 are accepted."
    },
    delaySeconds: {
      type: "integer",
      minimum: 0,
      maximum: 31536000,
      description: "Relative delay from now in seconds."
    },
    intervalSeconds: {
      type: "integer",
      minimum: 300,
      maximum: 31536000,
      description: "Optional recurring interval in seconds. Minimum is 300 seconds."
    },
    platform: platformProperty,
    conversationId: {
      type: "string",
      maxLength: 256,
      description: "Target conversation id. Defaults to the current conversation."
    },
    modelProviderId: modelProviderProperty,
    modelId: modelIdProperty,
    maxAttempts: {
      type: "integer",
      minimum: 1,
      maximum: 10,
      description: "Maximum attempts before marking the schedule failed."
    },
    retryDelaySeconds: {
      type: "integer",
      minimum: 60,
      maximum: 86400,
      description: "Delay before retrying a failed run."
    }
  },
  required: ["text"],
  additionalProperties: false
} as const;

export const listSchedulesInputJsonSchema = {
  type: "object",
  properties: {
    statuses: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
        enum: ["active", "paused", "completed", "cancelled", "failed"]
      },
      description: "Optional statuses to include."
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      description: "Maximum schedules to return."
    },
    includeText: {
      type: "boolean",
      description: "Include scheduled message text in the result."
    }
  },
  additionalProperties: false
} as const;

export const scheduleIdInputJsonSchema = {
  type: "object",
  properties: {
    scheduleId: {
      type: "string",
      description: "Schedule id, for example sch_..."
    }
  },
  required: ["scheduleId"],
  additionalProperties: false
} as const;
