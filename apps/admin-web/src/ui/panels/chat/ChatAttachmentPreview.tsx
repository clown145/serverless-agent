import { useEffect, useState } from "react";
import type { AdminClient } from "../../../api/client";
import type { ChatMessage, MessageAttachment } from "../../../api/types";

type ChatAttachmentPreviewProps = {
  client: AdminClient;
  message: ChatMessage;
  attachment: MessageAttachment;
};

export function ChatAttachmentPreview({
  client,
  message,
  attachment
}: ChatAttachmentPreviewProps) {
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (attachment.type !== "image") {
      return;
    }

    let cancelled = false;
    let nextUrl = "";
    client
      .getMessageAttachmentBlob(message.id, attachment.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        nextUrl = URL.createObjectURL(blob);
        setObjectUrl(nextUrl);
      })
      .catch(() => setObjectUrl(""));

    return () => {
      cancelled = true;
      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [attachment.id, attachment.type, client, message.id]);

  if (attachment.type === "image" && objectUrl) {
    return (
      <img
        alt={attachment.name ?? "attachment"}
        className="chat-image-preview"
        src={objectUrl}
      />
    );
  }

  return (
    <span>
      {attachment.type}
      {attachment.name ? ` · ${attachment.name}` : ""}
    </span>
  );
}
