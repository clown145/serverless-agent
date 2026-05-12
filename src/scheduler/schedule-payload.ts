import { z } from "zod";

export const schedulePayloadSchema = z.object({
  title: z.string().min(1).optional(),
  text: z.string().min(1),
  platform: z.enum(["telegram", "qq", "webhook", "admin", "webui"]).optional(),
  conversationId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  actorRole: z.enum(["owner", "admin", "member", "unknown"]).optional(),
  modelProviderId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional()
});

export type SchedulePayload = z.infer<typeof schedulePayloadSchema>;

export function parseSchedulePayload(value: string): SchedulePayload {
  return schedulePayloadSchema.parse(JSON.parse(value));
}

export function stringifySchedulePayload(payload: SchedulePayload): string {
  return JSON.stringify(schedulePayloadSchema.parse(payload));
}
