import { createId } from "../shared/ids";
import type { InternalMessage } from "../shared/types/internal-message";
import type { ScheduleFireJob } from "../shared/types/queue";

export function createScheduleMessage(job: ScheduleFireJob): InternalMessage {
  const id = createId("msg");

  return {
    id,
    platform: "admin",
    platformMessageId: id,
    agentId: job.agentId,
    conversationId: job.conversationId ?? "admin:schedule",
    sender: {
      platformUserId: "scheduler",
      displayName: "Scheduler",
      role: "owner"
    },
    kind: job.text.startsWith("/") ? "command" : "text",
    text: job.text,
    attachments: [],
    rawRef: `schedule:${job.scheduleId}`,
    scheduleId: job.scheduleId,
    receivedAt: job.receivedAt
  };
}
