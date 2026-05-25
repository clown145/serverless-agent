import { persistQqOfficialInboundMedia } from "../adapters/qq/official/inbound-media";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { persistInboundAttachments } from "./persist-attachments";
import type { InboundMediaResult } from "./inbound-media-types";

export async function persistInboundMedia(
  env: Env,
  message: InternalMessage
): Promise<InboundMediaResult> {
  const persisted = await persistInboundAttachments(env, message);

  if (persisted.platform === "qq") {
    return persistQqOfficialInboundMedia(env, persisted);
  }

  return { message: persisted };
}
