import { createId } from "../shared/ids";
import type { InternalMessage, Platform } from "../shared/types/internal-message";
import type { ScheduleFireJob } from "../shared/types/queue";

export function createScheduleMessage(job: ScheduleFireJob): InternalMessage {
  const id = createId("msg");
  const platform = job.platform ?? "admin";

  return {
    id,
    platform,
    platformMessageId: id,
    agentId: job.agentId,
    conversationId: job.conversationId ?? defaultScheduleConversation(platform),
    sender: {
      platformUserId: job.actorId ?? "scheduler",
      displayName: "Scheduler",
      role: job.actorRole ?? "owner"
    },
    kind: job.text.startsWith("/") ? "command" : "text",
    text: job.text,
    attachments: [],
    rawRef: `schedule:${job.scheduleId}`,
    scheduleId: job.scheduleId,
    modelProviderId: job.modelProviderId,
    modelId: job.modelId,
    receivedAt: job.receivedAt
  };
}

function defaultScheduleConversation(platform: Platform): string {
  if (platform === "webui") {
    return "webui:schedule";
  }

  return "admin:schedule";
}
