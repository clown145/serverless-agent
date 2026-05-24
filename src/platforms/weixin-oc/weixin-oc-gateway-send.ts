import {
  formatWeixinOcApiError,
  isSuccessfulWeixinOcPayload
} from "../../adapters/weixin-oc/api";
import type { WeixinOcBotConfig } from "../../adapters/weixin-oc/config";
import { buildWeixinOcTextItem } from "../../adapters/weixin-oc/normalize";
import {
  buildWeixinOcFileItem,
  buildWeixinOcImageItem,
  uploadWeixinOcMedia
} from "../../adapters/weixin-oc/media";
import type { WeixinOcSendItem } from "../../adapters/weixin-oc/types";
import { createId } from "../../shared/ids";
import { createWeixinOcGatewayClient } from "./weixin-oc-gateway-client";

export type WeixinOcGatewaySendInput = {
  userId?: string;
  text?: string;
  kind?: "text" | "image" | "file";
  file?: {
    bytes?: number[];
    fileName?: string;
    mimeType?: string;
  };
};

export type WeixinOcGatewaySendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export async function sendWeixinOcGatewayMessage(
  config: WeixinOcBotConfig,
  input: WeixinOcGatewaySendInput
): Promise<WeixinOcGatewaySendResult> {
  const userId = input.userId?.trim();
  const text = input.text?.trim();
  const kind = input.kind ?? "text";
  if (!userId) {
    return { ok: false, error: "userId is required" };
  }
  if (kind === "text" && !text) {
    return { ok: false, error: "text is required" };
  }
  if (!config.token) {
    return { ok: false, error: "Weixin OC is not logged in" };
  }

  const contextToken = config.contextTokens[userId];
  if (!contextToken) {
    return {
      ok: false,
      error: "context_token missing. Ask this WeChat user to send one message first."
    };
  }

  const itemList: WeixinOcSendItem[] = [];
  if (kind === "text") {
    itemList.push(buildWeixinOcTextItem(text ?? ""));
  } else {
    const file = parseGatewayFile(input.file);
    if (!file) {
      return { ok: false, error: "file bytes, fileName, and mimeType are required" };
    }
    if (text) {
      itemList.push(buildWeixinOcTextItem(text));
    }
    const client = createWeixinOcGatewayClient(config);
    const uploaded = await uploadWeixinOcMedia({
      client,
      cdnBaseUrl: config.cdnBaseUrl,
      toUserId: userId,
      file,
      kind
    });
    itemList.push(
      kind === "image"
        ? buildWeixinOcImageItem(uploaded)
        : buildWeixinOcFileItem({
            uploaded,
            fileName: file.fileName
          })
    );
  }

  return sendItems(config, userId, contextToken, itemList);
}

export async function sendWeixinOcGatewayTyping(
  config: WeixinOcBotConfig,
  userId: string | undefined
): Promise<void> {
  const cleanUserId = userId?.trim();
  if (!cleanUserId || !config.token) {
    return;
  }
  const contextToken = config.contextTokens[cleanUserId];
  if (!contextToken) {
    return;
  }

  const client = createWeixinOcGatewayClient(config);
  const configPayload = await client.getTypingConfig({
    userId: cleanUserId,
    contextToken
  });
  if (!isSuccessfulWeixinOcPayload(configPayload)) {
    return;
  }
  const typingTicket = String(configPayload.typing_ticket ?? "").trim();
  if (!typingTicket) {
    return;
  }
  await client.sendTypingState({
    userId: cleanUserId,
    typingTicket
  });
}

async function sendItems(
  config: WeixinOcBotConfig,
  userId: string,
  contextToken: string,
  itemList: WeixinOcSendItem[]
): Promise<WeixinOcGatewaySendResult> {
  let providerMessageId: string | undefined;

  for (const item of itemList) {
    const payload = await createWeixinOcGatewayClient(config).sendMessage({
      toUserId: userId,
      contextToken,
      itemList: [item]
    });
    if (!isSuccessfulWeixinOcPayload(payload as Record<string, unknown>)) {
      return {
        ok: false,
        error: formatWeixinOcApiError(payload as Record<string, unknown>)
      };
    }
    providerMessageId = payload.message_id ?? payload.msg_id ?? createId("wxoc_sent");
  }

  return {
    ok: true,
    providerMessageId
  };
}

function parseGatewayFile(input: {
  bytes?: number[];
  fileName?: string;
  mimeType?: string;
} | undefined): { bytes: Uint8Array; fileName: string; mimeType: string } | undefined {
  const fileName = input?.fileName?.trim();
  const mimeType = input?.mimeType?.trim();
  if (!fileName || !mimeType || !Array.isArray(input?.bytes)) {
    return undefined;
  }
  if (input.bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    return undefined;
  }
  return {
    bytes: new Uint8Array(input.bytes),
    fileName,
    mimeType
  };
}
