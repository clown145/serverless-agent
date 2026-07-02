import { Plus, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, EmailAddress, EmailIntegration, EmailMessage } from "../../api/types";
import { FormDialog } from "../FormDialog";
import { ToolbarButton } from "../ToolbarButton";
import {
  defaultEmailAccountDraft,
  draftFromIntegration,
  EmailAccountForm,
  type EmailAccountDraft
} from "./email/EmailAccountForm";
import { EmailAccountList } from "./email/EmailAccountList";
import { EmailComposeDialog } from "./email/EmailComposeDialog";
import { EmailMessageDetail } from "./email/EmailMessageDetail";
import { EmailMessageList } from "./email/EmailMessageList";
import type { PanelProps } from "./types";

type ComposeMode = "send" | "reply" | "forward";

export function EmailPanel({ client, notify }: PanelProps) {
  const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [sourceMessage, setSourceMessage] = useState<ChatMessage>();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<EmailIntegration>();
  const [accountDraft, setAccountDraft] = useState<EmailAccountDraft>(defaultEmailAccountDraft);
  const [composeMode, setComposeMode] = useState<ComposeMode>();

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId),
    [messages, selectedMessageId]
  );

  async function load() {
    const [accounts, emailMessages] = await Promise.all([
      client.getEmailIntegrations(),
      client.listEmailMessages({
        integrationId: selectedIntegrationId || undefined,
        limit: 50
      })
    ]);
    setIntegrations(accounts.integrations);
    setMessages(emailMessages.messages);
    if (!selectedIntegrationId && accounts.integrations[0]) {
      setSelectedIntegrationId(accounts.integrations[0].id);
    }
    if (!selectedMessageId && emailMessages.messages[0]) {
      setSelectedMessageId(emailMessages.messages[0].id);
    }
  }

  async function loadSelectedSourceMessage(email?: EmailMessage) {
    if (!email?.internalMessageId) {
      setSourceMessage(undefined);
      return;
    }
    const response = await client.listMessages({
      conversationId: email.conversationId,
      agentId: email.agentId,
      platform: "email",
      limit: 100
    });
    setSourceMessage(response.messages.find((message) => message.id === email.internalMessageId));
  }

  async function saveAccount() {
    const payload = accountPayload(accountDraft);
    if (editingIntegration) {
      await client.updateEmailIntegration(editingIntegration.id, payload);
    } else {
      await client.createEmailIntegration({
        ...payload,
        name: payload.name || "Email",
        fromAddress: payload.fromAddress || "",
        inboundAddresses: payload.inboundAddresses ?? []
      });
    }
    setAccountDialogOpen(false);
    setEditingIntegration(undefined);
    setAccountDraft(defaultEmailAccountDraft());
    notify("Email account saved", "ok");
    await load();
  }

  async function deleteAccount(id: string) {
    await client.deleteEmailIntegration(id);
    notify("Email account deleted", "ok");
    await load();
  }

  async function submitCompose(input: {
    to: string;
    subject: string;
    text: string;
    forwardMode?: "compose" | "eml_attachment";
    includeOriginalAttachments?: boolean;
  }) {
    const to = parseAddresses(input.to);
    if (composeMode === "send") {
      await client.sendEmail({
        integrationId: selectedIntegrationId || undefined,
        to,
        subject: input.subject,
        text: input.text
      });
    } else if (composeMode === "reply" && selectedMessage) {
      await client.replyEmail({ emailMessageId: selectedMessage.id, text: input.text });
    } else if (composeMode === "forward" && selectedMessage) {
      await client.forwardEmail({
        emailMessageId: selectedMessage.id,
        to,
        text: input.text,
        mode: input.forwardMode,
        includeOriginalAttachments: input.includeOriginalAttachments
      });
    }
    setComposeMode(undefined);
    notify("Email action submitted", "ok");
    await load();
  }

  async function saveAttachment(messageId: string, attachmentId: string) {
    const fileName = sourceMessage?.attachments.find((item) => item.id === attachmentId)?.name ?? attachmentId;
    const path = window.prompt("Save to VFS path", `/workspace/email/${fileName}`);
    if (!path) {
      return;
    }
    await client.saveEmailAttachment(messageId, attachmentId, path);
    notify("Attachment saved", "ok");
  }

  function openNewAccount() {
    setEditingIntegration(undefined);
    setAccountDraft(defaultEmailAccountDraft());
    setAccountDialogOpen(true);
  }

  function openEditAccount(integration: EmailIntegration) {
    setEditingIntegration(integration);
    setAccountDraft(draftFromIntegration(integration));
    setAccountDialogOpen(true);
  }

  useEffect(() => {
    load().catch((error) => notify(error instanceof Error ? error.message : "Failed to load email", "error"));
  }, [selectedIntegrationId]);

  useEffect(() => {
    loadSelectedSourceMessage(selectedMessage).catch(() => setSourceMessage(undefined));
  }, [selectedMessage?.id]);

  return (
    <section className="panel email-panel">
      <header className="panel-header">
        <div>
          <span>Email</span>
          <h2>Mailbox</h2>
        </div>
        <div className="panel-header-actions">
          <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
          <ToolbarButton label="New account" icon={Plus} onClick={openNewAccount} />
          <ToolbarButton label="Send" icon={Send} onClick={() => setComposeMode("send")} />
        </div>
      </header>
      <div className="email-layout">
        <aside className="email-sidebar">
          <h3>Accounts</h3>
          <EmailAccountList
            integrations={integrations}
            selectedId={selectedIntegrationId}
            onSelect={setSelectedIntegrationId}
            onEdit={openEditAccount}
            onDelete={(id) => void deleteAccount(id)}
          />
          <h3>Messages</h3>
          <EmailMessageList
            messages={messages}
            selectedId={selectedMessageId}
            onSelect={setSelectedMessageId}
          />
        </aside>
        <EmailMessageDetail
          client={client}
          email={selectedMessage}
          sourceMessage={sourceMessage}
          onCompose={setComposeMode}
          onSaveAttachment={(messageId, attachmentId) => void saveAttachment(messageId, attachmentId)}
        />
      </div>
      <FormDialog
        open={accountDialogOpen}
        title={editingIntegration ? "Edit Email Account" : "New Email Account"}
        onOpenChange={setAccountDialogOpen}
      >
        <EmailAccountForm
          draft={accountDraft}
          editing={editingIntegration}
          onChange={setAccountDraft}
          onSubmit={() => void saveAccount()}
        />
      </FormDialog>
      <EmailComposeDialog
        mode={composeMode ?? "send"}
        open={Boolean(composeMode)}
        sourceMessage={selectedMessage}
        onOpenChange={(open) => {
          if (!open) {
            setComposeMode(undefined);
          }
        }}
        onSubmit={(input) => void submitCompose(input)}
      />
    </section>
  );
}

function accountPayload(draft: EmailAccountDraft) {
  return {
    agentId: draft.agentId.trim() || undefined,
    name: draft.name.trim(),
    fromAddress: draft.fromAddress.trim(),
    fromName: draft.fromName.trim() || undefined,
    replyTo: draft.replyTo.trim() || undefined,
    inboundAddresses: draft.inboundAddresses
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    resendApiKey: draft.resendApiKey.trim() || undefined
  };
}

function parseAddresses(value: string): EmailAddress[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((address) => ({ address }));
}
