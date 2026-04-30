import type { InternalMessage } from "../../shared/types/internal-message";
import { nowIso } from "../../shared/time";

export async function insertMessage(
  db: D1Database,
  message: InternalMessage
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO messages (
        id, agent_id, conversation_id, platform, platform_message_id,
        sender_id, kind, text, raw_ref, received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.id,
      message.agentId,
      message.conversationId,
      message.platform,
      message.platformMessageId,
      message.sender.platformUserId,
      message.kind,
      message.text ?? null,
      message.rawRef ?? null,
      message.receivedAt,
      nowIso()
    )
    .run();
}
