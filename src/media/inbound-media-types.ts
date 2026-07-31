import type { InternalMessage } from "../shared/types/internal-message";

export type InboundMediaRejection = {
  code: "attachment_too_large";
  attachmentIds: string[];
  responseText: string;
  summary: string;
};

export type InboundMediaResult = {
  message: InternalMessage;
  rejection?: InboundMediaRejection;
};
