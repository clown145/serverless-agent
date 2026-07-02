import { Forward, Reply, Send } from "lucide-react";
import type { AdminClient } from "../../../api/client";
import type { ChatMessage, EmailMessage } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { ToolbarButton } from "../../ToolbarButton";
import { EmailAttachmentList } from "./EmailAttachmentList";
import { formatEmailAddress, formatEmailList } from "./emailFormat";

type EmailMessageDetailProps = {
  client: AdminClient;
  email?: EmailMessage;
  sourceMessage?: ChatMessage;
  onCompose: (mode: "send" | "reply" | "forward") => void;
  onSaveAttachment: (messageId: string, attachmentId: string) => void;
};

export function EmailMessageDetail({
  client,
  email,
  sourceMessage,
  onCompose,
  onSaveAttachment
}: EmailMessageDetailProps) {
  if (!email) {
    return <EmptyState label="Select an email" />;
  }

  return (
    <section className="email-detail">
      <header className="email-detail-header">
        <div>
          <h2>{email.subject || "(no subject)"}</h2>
          <p>{formatEmailAddress(email.from)}</p>
        </div>
        <div className="panel-header-actions">
          <ToolbarButton label="Send" icon={Send} onClick={() => onCompose("send")} />
          <ToolbarButton label="Reply" icon={Reply} onClick={() => onCompose("reply")} />
          <ToolbarButton label="Forward" icon={Forward} onClick={() => onCompose("forward")} />
        </div>
      </header>
      <dl className="email-meta">
        <dt>To</dt>
        <dd>{formatEmailList(email.to)}</dd>
        {email.cc.length > 0 && (
          <>
            <dt>Cc</dt>
            <dd>{formatEmailList(email.cc)}</dd>
          </>
        )}
        <dt>Status</dt>
        <dd>{email.status}</dd>
      </dl>
      <pre className="email-body">{email.textBody || email.snippet || ""}</pre>
      {email.htmlBody && (
        <iframe className="email-html-preview" sandbox="" srcDoc={email.htmlBody} title="Email HTML" />
      )}
      <h3>Attachments</h3>
      <EmailAttachmentList client={client} message={sourceMessage} onSave={onSaveAttachment} />
    </section>
  );
}
