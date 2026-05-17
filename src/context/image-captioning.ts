import { bytesToBase64 } from "../security/base64";
import type { Env } from "../shared/types/env";
import type { MessageAttachment } from "../shared/types/internal-message";
import { updateMessageAttachmentCaption } from "../storage/repositories/message-attachments-repository";
import type { ConversationContextMessage } from "../core/agent-context";
import type { ModelContentPart } from "../core/model/types";
import { resolveRoleModelConfig, type ResolvedModelConfig } from "../core/model/provider-config";
import { createModelProviderFromConfig } from "../core/model/provider-factory";

const CAPTION_PROMPT = [
  "Describe this image for a downstream text-only agent.",
  "Include visible text, UI elements, objects, people, charts, spatial relationships, and details relevant to user intent.",
  "Be factual and concise. If the image is unclear, say so."
].join("\n");

type CaptionModel = {
  config: ResolvedModelConfig;
  providerId?: string;
  modelId: string;
};

export async function replaceImagesWithCaptions(
  env: Env,
  agentId: string,
  history: ConversationContextMessage[]
): Promise<ConversationContextMessage[]> {
  if (!history.some((message) => message.attachments?.some((part) => part.type === "image"))) {
    return history;
  }

  const captionConfig = await resolveCaptionModel(env, agentId);
  const captioned: ConversationContextMessage[] = [];

  for (const message of history) {
    if (!message.attachments?.length) {
      captioned.push(message);
      continue;
    }

    const captions = await captionMessageImages(env, captionConfig, message);
    captioned.push({
      ...message,
      text: appendCaptions(message.text, captions),
      attachments: []
    });
  }

  return captioned;
}

async function resolveCaptionModel(env: Env, agentId: string): Promise<CaptionModel> {
  const config = await resolveRoleModelConfig(env, agentId, "vision");
  if (!config?.model) {
    throw new Error("Image captioning is enabled but no vision model is configured.");
  }

  return {
    config,
    providerId: config.providerId,
    modelId: config.model
  };
}

async function captionMessageImages(
  env: Env,
  captionModel: CaptionModel,
  message: ConversationContextMessage
): Promise<string[]> {
  const captions: string[] = [];
  let index = 1;
  for (const part of message.attachments ?? []) {
    if (part.type !== "image") {
      continue;
    }

    const attachment = part.sourceAttachment;
    const caption = attachment && cachedCaptionMatches(attachment, captionModel)
      ? attachment.captionText
      : await generateAndCacheCaption(env, captionModel, message.id, part);
    captions.push(`[Image ${index}]\n${caption}`);
    index += 1;
  }

  return captions;
}

function cachedCaptionMatches(
  attachment: MessageAttachment,
  captionModel: CaptionModel
): boolean {
  return Boolean(
    attachment.captionText &&
    attachment.captionModelProviderId === captionModel.providerId &&
    attachment.captionModelId === captionModel.modelId
  );
}

async function generateAndCacheCaption(
  env: Env,
  captionModel: CaptionModel,
  messageId: string,
  image: ModelContentPart & { type: "image" }
): Promise<string> {
  const provider = createModelProviderFromConfig(captionModel.config);
  const response = await provider.complete({
    tools: [],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: CAPTION_PROMPT },
          image
        ]
      }
    ]
  });
  const captionText = response.content?.trim();
  if (!captionText) {
    throw new Error("Vision model did not return an image caption.");
  }

  if (image.sourceAttachment) {
    await updateMessageAttachmentCaption(env.AGENT_DB, {
      messageId,
      attachmentId: image.sourceAttachment.id,
      captionText,
      captionModelProviderId: captionModel.providerId,
      captionModelId: captionModel.modelId
    });
  }

  return captionText;
}

export function imagePartFromAttachment(
  attachment: MessageAttachment,
  object: R2ObjectBody
): Promise<ModelContentPart & { type: "image" }> {
  return object.arrayBuffer().then((buffer) => ({
    type: "image",
    mimeType: attachment.mimeType ?? object.httpMetadata?.contentType ?? "image/jpeg",
    dataBase64: bytesToBase64(new Uint8Array(buffer)),
    sourceAttachment: attachment
  }));
}

function appendCaptions(text: string | undefined, captions: string[]): string | undefined {
  if (captions.length === 0) {
    return text;
  }

  return [
    text,
    "Image descriptions:",
    captions.join("\n\n")
  ].filter(Boolean).join("\n\n");
}
