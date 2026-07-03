import { Download, Save } from "lucide-react";
import type { AdminClient } from "../../../api/client";
import type { ChatMessage } from "../../../api/types";
import { ToolbarButton } from "../../ToolbarButton";

type EmailAttachmentListProps = {
  client: AdminClient;
  message?: ChatMessage;
  onSave: (messageId: string, attachmentId: string) => void;
};

export function EmailAttachmentList({ client, message, onSave }: EmailAttachmentListProps) {
  if (!message?.attachments.length) {
    return <div className="empty-state">No attachments</div>;
  }

  async function download(messageId: string, attachmentId: string, name?: string) {
    const blob = await client.getMessageAttachmentBlob(messageId, attachmentId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name || "attachment";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="email-attachment-list">
      {message.attachments.map((attachment) => (
        <div className="email-attachment-row" key={attachment.id}>
          <span>
            <strong>{attachment.name || attachment.id}</strong>
            <small>{attachment.mimeType || attachment.type}</small>
          </span>
          <span className="row-actions">
            <ToolbarButton
              label="Download"
              icon={Download}
              onClick={() => download(message.id, attachment.id, attachment.name)}
            />
            <ToolbarButton
              label="Save"
              icon={Save}
              onClick={() => onSave(message.id, attachment.id)}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
