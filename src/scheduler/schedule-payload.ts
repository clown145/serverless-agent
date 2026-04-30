import { z } from "zod";

export const schedulePayloadSchema = z.object({
  text: z.string().min(1),
  conversationId: z.string().min(1).optional()
});

export type SchedulePayload = z.infer<typeof schedulePayloadSchema>;

export function parseSchedulePayload(value: string): SchedulePayload {
  return schedulePayloadSchema.parse(JSON.parse(value));
}

export function stringifySchedulePayload(payload: SchedulePayload): string {
  return JSON.stringify(schedulePayloadSchema.parse(payload));
}
