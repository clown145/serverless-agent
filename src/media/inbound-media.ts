import { persistQqOfficialInboundMedia } from "../adapters/qq/official/inbound-media";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import { persistInboundAttachments } from "./persist-attachments";

export async function persistInboundMedia(env: Env, message: InternalMessage): Promise<InternalMessage> {
  let persisted = await persistInboundAttachments(env, message);

  if (persisted.platform === "qq") {
    persisted = await persistQqOfficialInboundMedia(env, persisted);
  }

  return persisted;
}
