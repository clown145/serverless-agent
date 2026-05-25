import type { OutboundFile } from "../../../platforms/outbound/types";
import type { QqOfficialMedia, QqOfficialMessageSendResponse, QqOfficialSendTarget } from "./types";
import { QqOfficialApiClient } from "./api";
import { qqOfficialFileDataBase64, qqOfficialFileType } from "./media";

export type QqOfficialAttachmentSendInput = {
  target: QqOfficialSendTarget;
  file: OutboundFile;
  content?: string;
  msgId?: string;
  eventId?: string;
};

export type QqOfficialAttachmentSendResult =
  | {
      ok: true;
      response: QqOfficialMessageSendResponse;
    }
  | {
      ok: false;
      error: string;
    };

export async function trySendQqOfficialAttachment(
  api: QqOfficialApiClient,
  input: QqOfficialAttachmentSendInput
): Promise<QqOfficialAttachmentSendResult> {
  const unsupported = qqOfficialUnsupportedAttachmentMessage(input);
  if (unsupported) {
    return { ok: false, error: unsupported };
  }

  return {
    ok: true,
    response: await sendQqOfficialAttachment(api, input)
  };
}

export async function sendQqOfficialAttachment(
  api: QqOfficialApiClient,
  input: QqOfficialAttachmentSendInput
): Promise<QqOfficialMessageSendResponse> {
  if (input.target.kind === "group") {
    const media = await uploadGroupFile(api, input.target.groupOpenId, input.file);
    return api.sendGroupMessage({
      groupOpenId: input.target.groupOpenId,
      content: input.content,
      media,
      msgType: 7,
      msgId: input.msgId,
      eventId: input.eventId
    });
  }

  if (input.target.kind === "c2c") {
    const media = await uploadC2cFile(api, input.target.openId, input.file);
    return api.sendC2cMessage({
      openId: input.target.openId,
      content: input.content,
      media,
      msgType: 7,
      msgId: input.msgId,
      eventId: input.eventId
    });
  }

  if (input.target.kind === "direct") {
    return api.sendDirectImage({
      guildId: input.target.guildId,
      content: input.content,
      file: input.file,
      msgId: input.msgId,
      eventId: input.eventId
    });
  }

  return api.sendChannelImage({
    channelId: input.target.channelId,
    content: input.content,
    file: input.file,
    msgId: input.msgId,
    eventId: input.eventId
  });
}

function qqOfficialUnsupportedAttachmentMessage(
  input: QqOfficialAttachmentSendInput
): string | undefined {
  if (
    (input.target.kind === "channel" || input.target.kind === "direct") &&
    !isImageFile(input.file)
  ) {
    return "QQ official channel and direct conversations only support image attachments";
  }
  return undefined;
}

async function uploadGroupFile(
  api: QqOfficialApiClient,
  groupOpenId: string,
  file: OutboundFile
): Promise<QqOfficialMedia> {
  return api.uploadGroupFile({
    groupOpenId,
    fileDataBase64: qqOfficialFileDataBase64(file),
    fileType: qqOfficialFileType(file)
  });
}

async function uploadC2cFile(
  api: QqOfficialApiClient,
  openId: string,
  file: OutboundFile
): Promise<QqOfficialMedia> {
  return api.uploadC2cFile({
    openId,
    fileDataBase64: qqOfficialFileDataBase64(file),
    fileType: qqOfficialFileType(file)
  });
}

function isImageFile(file: OutboundFile): boolean {
  return file.mimeType.startsWith("image/");
}
