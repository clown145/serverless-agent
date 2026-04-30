import type { InternalMessage } from "./internal-message";

export type InboundMessageJob = {
  type: "inbound.message";
  eventId: string;
  agentId: string;
  message: InternalMessage;
  receivedAt: string;
};

export type ScheduleTickJob = {
  type: "schedule.tick";
  eventId: string;
  agentId: string;
  scheduledTime: string;
  receivedAt: string;
};

export type QueueMessageBody = InboundMessageJob | ScheduleTickJob;
