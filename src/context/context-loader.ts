import type { ConversationContextMessage } from "../core/agent-context";
import { createModelProvider } from "../core/model/provider-factory";
import type { ModelContentPart } from "../core/model/types";
import { bytesToBase64 } from "../security/base64";
import type { Env } from "../shared/types/env";
import type { InternalMessage } from "../shared/types/internal-message";
import type { ConversationMessage } from "../storage/repositories/message-types";
import { listConversationMessages } from "../storage/repositories/messages-repository";
import {
  ensureConversationSettings,
  updateConversationSummary
} from "../storage/repositories/conversation-settings-repository";
import type { ConversationSettingsRecord } from "../storage/repositories/conversation-settings-types";
import { rootConversationId } from "../conversations/ids";

const CONTEXT_SCAN_LIMIT = 100;
const MAX_INLINE_IMAGES = 4;
const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;

export type LoadedAgentContext = {
  settings: ConversationSettingsRecord;
  history: ConversationContextMessage[];
  summary?: string;
};

export async function loadAgentContext(
  env: Env,
  message: InternalMessage
): Promise<LoadedAgentContext> {
  const settings = await ensureConversationSettings(env.AGENT_DB, {
    agentId: message.agentId,
    conversationId: message.conversationId,
    platform: message.platform,
    rootConversationId: rootConversationId(message.conversationId)
  });
  const allMessages = await listConversationMessages(env.AGENT_DB, {
    agentId: message.agentId,
    conversationId: message.conversationId,
    limit: CONTEXT_SCAN_LIMIT
  });
  const { summary, recent } = await maybeCompactContext(env, settings, allMessages);

  return {
    settings,
    summary,
    history: await hydrateHistoryAttachments(env, recent)
  };
}

export async function compactConversationNow(
  env: Env,
  message: InternalMessage
): Promise<string | undefined> {
  return compactConversationById(env, {
    agentId: message.agentId,
    conversationId: message.conversationId,
    platform: message.platform
  });
}

export async function compactConversationById(
  env: Env,
  input: {
    agentId: string;
    conversationId: string;
    platform: InternalMessage["platform"];
  }
): Promise<string | undefined> {
  const settings = await ensureConversationSettings(env.AGENT_DB, {
    agentId: input.agentId,
    conversationId: input.conversationId,
    platform: input.platform,
    rootConversationId: rootConversationId(input.conversationId)
  });
  const allMessages = await listConversationMessages(env.AGENT_DB, {
    agentId: input.agentId,
    conversationId: input.conversationId,
    limit: CONTEXT_SCAN_LIMIT
  });
  const oldMessages = allMessages.slice(0, Math.max(allMessages.length - settings.historyLimit, 0));
  if (!oldMessages.length) {
    return settings.summaryText;
  }

  return summarizeAndStore(env, settings, oldMessages, true);
}

async function maybeCompactContext(
  env: Env,
  settings: ConversationSettingsRecord,
  allMessages: ConversationMessage[]
): Promise<{ summary?: string; recent: ConversationMessage[] }> {
  const historyLimit = settings.historyLimit;
  if (allMessages.length <= historyLimit) {
    return { summary: settings.summaryText, recent: allMessages };
  }

  const oldMessages = allMessages.slice(0, allMessages.length - historyLimit);
  const recent = allMessages.slice(-historyLimit);
  const compactedUntil = oldMessages[oldMessages.length - 1]?.id;

  if (
    !settings.summaryEnabled ||
    !compactedUntil ||
    settings.compactedUntilMessageId === compactedUntil
  ) {
    return { summary: settings.summaryText, recent };
  }

  try {
    const summary = await summarizeAndStore(env, settings, oldMessages, false);
    return { summary, recent };
  } catch {
    return { summary: settings.summaryText, recent };
  }
}

async function summarizeAndStore(
  env: Env,
  settings: ConversationSettingsRecord,
  messages: ConversationMessage[],
  force: boolean
): Promise<string | undefined> {
  const compactedUntilMessageId = messages[messages.length - 1]?.id;
  if (!compactedUntilMessageId) {
    return settings.summaryText;
  }
  if (!force && settings.compactedUntilMessageId === compactedUntilMessageId) {
    return settings.summaryText;
  }

  const provider = await createModelProvider(env, settings.agentId, {
    conversationId: settings.conversationId,
    providerId: settings.summaryProviderId,
    modelId: settings.summaryModelId
  });
  const response = await provider.complete({
    tools: [],
    messages: [
      {
        role: "system",
        content: [
          "Summarize older conversation history for a long-running agent.",
          "Keep durable facts, user preferences, decisions, tasks, file paths, tool outcomes, credentials status, and unresolved questions.",
          "Be concise. Do not invent details."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          settings.summaryText
            ? `Existing summary:\n${settings.summaryText}\n`
            : "",
          "Messages to merge into the summary:",
          messages.map(formatMessageForSummary).join("\n")
        ].join("\n")
      }
    ]
  });
  const summaryText = response.content?.trim() || settings.summaryText;
  if (!summaryText) {
    return undefined;
  }

  await updateConversationSummary(env.AGENT_DB, {
    agentId: settings.agentId,
    conversationId: settings.conversationId,
    summaryText,
    compactedUntilMessageId
  });
  return summaryText;
}

async function hydrateHistoryAttachments(
  env: Env,
  messages: ConversationMessage[]
): Promise<ConversationContextMessage[]> {
  let imageCount = 0;
  const history: ConversationContextMessage[] = [];

  for (const message of messages) {
    const attachments: ModelContentPart[] = [];
    for (const attachment of message.attachments) {
      if (imageCount >= MAX_INLINE_IMAGES || attachment.type !== "image" || !attachment.r2Key) {
        continue;
      }

      const object = await env.AGENT_BUCKET.get(attachment.r2Key);
      if (!object || (object.size ?? 0) > MAX_INLINE_IMAGE_BYTES) {
        continue;
      }

      attachments.push({
        type: "image",
        mimeType: attachment.mimeType ?? object.httpMetadata?.contentType ?? "image/jpeg",
        dataBase64: bytesToBase64(new Uint8Array(await object.arrayBuffer()))
      });
      imageCount += 1;
    }

    history.push({
      id: message.id,
      role: message.role,
      text: message.text,
      attachments
    });
  }

  return history;
}

function formatMessageForSummary(message: ConversationMessage): string {
  const attachmentNote = message.attachments.length
    ? ` [attachments:${message.attachments.map((item) => item.type).join(",")}]`
    : "";
  return `${message.role}: ${message.text ?? ""}${attachmentNote}`.trim();
}
