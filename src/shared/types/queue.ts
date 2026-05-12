import type { InternalMessage, Platform, SenderRole } from "./internal-message";

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

export type ScheduleFireJob = {
  type: "schedule.fire";
  eventId: string;
  agentId: string;
  scheduleId: string;
  title?: string;
  text: string;
  platform?: Platform;
  conversationId?: string;
  actorId?: string;
  actorRole?: SenderRole;
  modelProviderId?: string;
  modelId?: string;
  scheduledTime: string;
  receivedAt: string;
};

export type QueueMessageBody =
  | InboundMessageJob
  | ScheduleTickJob
  | ScheduleFireJob;
