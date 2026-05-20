import type { QueueMessageBody } from "./queue";

export interface Env {
  AGENT_QUEUE: Queue<QueueMessageBody>;
  AGENT_OBJECT: DurableObjectNamespace;
  QQ_OFFICIAL_GATEWAY: DurableObjectNamespace;
  AGENT_BUCKET: R2Bucket;
  AGENT_DB: D1Database;
  AGENT_KV: KVNamespace;
  ASSETS?: Fetcher;

  DEFAULT_AGENT_ID?: string;
  AGENT_MASTER_KEY?: string;
  INTERNAL_ADMIN_TOKEN?: string;
  AGENT_TIMEZONE?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  QQ_OFFICIAL_APP_ID?: string;
  QQ_OFFICIAL_SECRET?: string;
  QQ_OFFICIAL_SANDBOX?: string;
  QQ_OFFICIAL_ENABLE_GROUP_C2C?: string;
  QQ_OFFICIAL_ENABLE_GUILD_DIRECT_MESSAGE?: string;
  QQ_OFFICIAL_ENABLE_PUBLIC_GUILD_MESSAGES?: string;
  MODEL_PROVIDER?: "openai" | "gemini" | "mock";
  MODEL_NAME?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_BASE_URL?: string;
  GEMINI_MODEL?: string;
  TAVILY_API_KEY?: string;
  TAVILY_BASE_URL?: string;
  EXA_API_KEY?: string;
  EXA_BASE_URL?: string;
}
