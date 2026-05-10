import { callTelegramApi } from "./api";

export type TelegramFile = {
  file_id: string;
  file_unique_id?: string;
  file_size?: number;
  file_path?: string;
};

export async function getTelegramFileDownload(
  token: string,
  fileId: string
): Promise<{ bytes: Uint8Array; mimeType?: string }> {
  const file = await callTelegramApi<TelegramFile>(token, "getFile", {
    file_id: fileId
  });

  if (!file.file_path) {
    throw new Error("Telegram file path is missing");
  }

  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!response.ok) {
    throw new Error(`Telegram file download failed: ${response.status}`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") ?? undefined
  };
}
