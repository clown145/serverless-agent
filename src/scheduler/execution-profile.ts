import { z } from "zod";
import type { Platform, SenderRole } from "../shared/types/internal-message";

export const scheduleExecutionProfileSchema = z.object({
  runAs: z.enum(["creator", "scheduler", "owner"]).default("creator"),
  contextMode: z.enum(["latest_conversation", "isolated", "snapshot"]).default("latest_conversation"),
  modelMode: z.enum(["fixed", "follow_conversation"]).default("follow_conversation"),
  permissionMode: z.enum(["creator_current", "creator_snapshot", "scheduler_limited"]).default("creator_current"),
  createdByActorId: z.string().min(1),
  createdByActorRole: z.enum(["owner", "admin", "member", "unknown"]).optional(),
  createdFromPlatform: z.enum(["telegram", "qq", "wecom", "webhook", "admin", "webui"]).optional(),
  createdFromConversationId: z.string().min(1).optional(),
  createdFromRunId: z.string().min(1).optional(),
  modelProviderId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional()
});

export type ScheduleExecutionProfile = z.infer<typeof scheduleExecutionProfileSchema>;

export type CreateScheduleExecutionProfileInput = {
  createdByActorId: string;
  createdByActorRole?: SenderRole;
  createdFromPlatform?: Platform;
  createdFromConversationId?: string;
  createdFromRunId?: string;
  modelProviderId?: string;
  modelId?: string;
  contextMode?: ScheduleExecutionProfile["contextMode"];
  runAs?: ScheduleExecutionProfile["runAs"];
  modelMode?: ScheduleExecutionProfile["modelMode"];
  permissionMode?: ScheduleExecutionProfile["permissionMode"];
};

export function createScheduleExecutionProfile(
  input: CreateScheduleExecutionProfileInput
): ScheduleExecutionProfile {
  return scheduleExecutionProfileSchema.parse({
    runAs: input.runAs ?? "creator",
    contextMode: input.contextMode ?? "latest_conversation",
    modelMode: input.modelProviderId && input.modelId
      ? input.modelMode ?? "fixed"
      : input.modelMode ?? "follow_conversation",
    permissionMode: input.permissionMode ?? "creator_current",
    createdByActorId: input.createdByActorId,
    createdByActorRole: input.createdByActorRole,
    createdFromPlatform: input.createdFromPlatform,
    createdFromConversationId: input.createdFromConversationId,
    createdFromRunId: input.createdFromRunId,
    modelProviderId: input.modelProviderId,
    modelId: input.modelId
  });
}

export function stringifyScheduleExecutionProfile(
  profile: ScheduleExecutionProfile
): string {
  return JSON.stringify(scheduleExecutionProfileSchema.parse(profile));
}

export function parseScheduleExecutionProfile(
  value: string | undefined
): ScheduleExecutionProfile | undefined {
  if (!value) {
    return undefined;
  }

  return scheduleExecutionProfileSchema.parse(JSON.parse(value));
}
