import type { QueueMessageBody } from "./queue";

export interface Env {
  AGENT_QUEUE: Queue<QueueMessageBody>;
  AGENT_OBJECT: DurableObjectNamespace;
  AGENT_BUCKET: R2Bucket;
  AGENT_DB: D1Database;
  AGENT_KV: KVNamespace;

  DEFAULT_AGENT_ID?: string;
  INTERNAL_ADMIN_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  OPENAI_API_KEY?: string;
}
