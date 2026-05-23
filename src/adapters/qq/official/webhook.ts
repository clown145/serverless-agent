import { resolveQqOfficialCredential } from "./credential";
import { normalizeQqOfficialGatewayEvent } from "./normalize";
import {
  createQqOfficialWebhookValidationResponse,
  type QqOfficialWebhookValidationPayload
} from "./webhook-validation";
import { createId } from "../../../shared/ids";
import { nowIso } from "../../../shared/time";
import type { Env } from "../../../shared/types/env";
import type { QueueMessageBody } from "../../../shared/types/queue";
import type { PlatformIntegrationRecord } from "../../../storage/repositories/platform-integration-types";
import { upsertQqOfficialConversation } from "../../../storage/repositories/qq-official-conversations-repository";
import type { QqOfficialGatewayPayload, QqOfficialMessagePayload } from "./types";

const QQ_WEBHOOK_VALIDATION_OPCODE = 13;
const QQ_WEBHOOK_ACK_OPCODE = 12;
const QQ_DISPATCH_OPCODE = 0;

export type QqOfficialWebhookResult = {
  response: unknown;
  handled: boolean;
};

export async function handleQqOfficialWebhookPayload(
  env: Env,
  integration: PlatformIntegrationRecord,
  payload: QqOfficialGatewayPayload
): Promise<QqOfficialWebhookResult> {
  if (payload.op === QQ_WEBHOOK_VALIDATION_OPCODE) {
    const secret = await requireWebhookSecret(env, integration);
    return {
      response: await createQqOfficialWebhookValidationResponse(
        secret,
        (payload.d ?? {}) as QqOfficialWebhookValidationPayload
      ),
      handled: true
    };
  }

  if (payload.op === QQ_DISPATCH_OPCODE && payload.t && payload.d) {
    await dispatchQqOfficialWebhookEvent(env, integration, payload);
    return {
      response: { opcode: QQ_WEBHOOK_ACK_OPCODE },
      handled: true
    };
  }

  return {
    response: { opcode: QQ_WEBHOOK_ACK_OPCODE },
    handled: false
  };
}

async function dispatchQqOfficialWebhookEvent(
  env: Env,
  integration: PlatformIntegrationRecord,
  payload: QqOfficialGatewayPayload
): Promise<void> {
  const normalized = normalizeQqOfficialGatewayEvent(
    payload.t ?? "",
    payload.d as QqOfficialMessagePayload,
    integration.agentId
  );

  if (normalized.conversationBinding) {
    await upsertQqOfficialConversation(env.AGENT_DB, {
      integrationId: integration.id,
      agentId: integration.agentId,
      binding: normalized.conversationBinding
    });
  }

  if (!normalized.message) {
    return;
  }

  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: createId("evt"),
    agentId: integration.agentId,
    message: normalized.message,
    receivedAt: nowIso()
  };
  await env.AGENT_QUEUE.send(job);
}

async function requireWebhookSecret(
  env: Env,
  integration: PlatformIntegrationRecord
): Promise<string> {
  const secret =
    (await resolveQqOfficialCredential(env, integration)) ??
    stringConfig(integration.config.secret);
  if (!secret) {
    throw new Error("QQ official secret is required for webhook validation");
  }
  return secret;
}

function stringConfig(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
