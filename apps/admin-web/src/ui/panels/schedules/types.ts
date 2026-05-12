import type { ModelCatalogItem, ModelProvider, Schedule } from "../../../api/types";

export type ScheduleFormState = {
  title: string;
  text: string;
  timeMode: "delay" | "dueAt";
  delaySeconds: number;
  dueAt: string;
  intervalSeconds: number;
  platform: Schedule["platform"];
  conversationId: string;
  actorId: string;
  modelProviderId: string;
  modelId: string;
  maxAttempts: number;
  retryDelaySeconds: number;
};

export type SchedulePayloadPreview = {
  title?: string;
  text?: string;
  platform?: string;
  conversationId?: string;
  modelId?: string;
};

export type ScheduleModelOptions = {
  providers: ModelProvider[];
  models: ModelCatalogItem[];
};
