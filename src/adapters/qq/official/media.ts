import { bytesToBase64 } from "../../../security/base64";
import type { OutboundFile } from "../../../platforms/outbound/types";

export const QQ_OFFICIAL_FILE_TYPE = {
  image: 1,
  video: 2,
  audio: 3,
  file: 4
} as const;

export function qqOfficialFileType(file: OutboundFile): number {
  if (file.mimeType.startsWith("image/")) {
    return QQ_OFFICIAL_FILE_TYPE.image;
  }
  if (file.mimeType.startsWith("video/")) {
    return QQ_OFFICIAL_FILE_TYPE.video;
  }
  if (file.mimeType.startsWith("audio/")) {
    return QQ_OFFICIAL_FILE_TYPE.audio;
  }
  return QQ_OFFICIAL_FILE_TYPE.file;
}

export function qqOfficialFileDataBase64(file: OutboundFile): string {
  return bytesToBase64(file.bytes);
}
