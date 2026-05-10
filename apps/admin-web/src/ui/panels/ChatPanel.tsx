import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminClient } from "../../api/client";
import type { ChatMessage, ConversationSettings } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { ToolbarButton } from "../ToolbarButton";
import { ChatComposer } from "./chat/ChatComposer";
import type { PendingChatAttachment } from "./chat/ChatComposer";
import { ChatTranscript } from "./chat/ChatTranscript";

type ChatPanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  onRun: (runId: string) => void;
  selectedConversationId?: string;
  onConversationChange?: (conversationId: string) => void;
};

export function ChatPanel({
  client,
  notify,
  onRun,
  selectedConversationId,
  onConversationChange
}: ChatPanelProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingChatAttachment[]>([]);
  const [localConversationId, setLocalConversationId] = useState("webui:default");
  const conversationId = selectedConversationId ?? localConversationId;
  const [conversations, setConversations] = useState<ConversationSettings[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastRunId, setLastRunId] = useState("");
  const [busy, setBusy] = useState(false);

  function setConversationId(value: string) {
    setLocalConversationId(value);
    onConversationChange?.(value);
  }

  async function loadMessages() {
    try {
      const result = await client.listMessages({ conversationId });
      setMessages(result.messages);
    } catch (error) {
      notify(error instanceof Error ? error.message : t("chat.loadFailed"), "error");
    }
  }

  async function loadConversations() {
    try {
      const result = await client.listConversations({ platform: "webui", limit: 80 });
      setConversations(result.conversations);
    } catch {
      setConversations([]);
    }
  }

  async function send() {
    if (!text.trim() && attachments.length === 0) {
      return;
    }

    setBusy(true);
    try {
      const result = await client.sendMessage({ text, conversationId, attachments });
      const runId = result.result?.runId;
      setText("");
      setAttachments([]);
      setLastRunId(runId ?? "");
      await Promise.all([loadMessages(), loadConversations()]);
      notify(runId ? t("chat.runCompleted", { runId }) : t("chat.messageSent"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : t("chat.sendFailed"), "error");
      await loadMessages();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadMessages(), loadConversations()]);
  }, [conversationId]);

  function openLastRun() {
    if (lastRunId) {
      onRun(lastRunId);
    }
  }

  async function createConversation() {
    try {
      const result = await client.createConversation({
        platform: "webui",
        title: t("chat.newConversation")
      });
      setConversationId(result.conversation.conversationId);
      notify(t("chat.conversationCreated"), "ok");
      await loadConversations();
    } catch (error) {
      notify(error instanceof Error ? error.message : t("chat.sendFailed"), "error");
    }
  }

  return (
    <section className="panel chat-panel">
      <header className="panel-header">
        <div>
          <h1>{t("chat.title")}</h1>
          <p>platform:webui</p>
        </div>
        <div className="tool-meta">
          {lastRunId && (
            <ToolbarButton label={t("chat.openRun")} icon={ExternalLink} onClick={openLastRun} />
          )}
          <ToolbarButton
            label={t("chat.newConversation")}
            icon={Plus}
            onClick={() => void createConversation()}
          />
          <ToolbarButton
            label={t("common.refresh")}
            icon={RefreshCw}
            onClick={() => void Promise.all([loadMessages(), loadConversations()])}
          />
        </div>
      </header>

      <div className="chat-session-bar">
        <label>
          {t("chat.conversation")}
          <input value={conversationId} onChange={(event) => setConversationId(event.target.value)} />
        </label>
        <label>
          {t("chat.switchConversation")}
          <select
            value={conversations.some((item) => item.conversationId === conversationId) ? conversationId : ""}
            onChange={(event) => {
              if (event.target.value) {
                setConversationId(event.target.value);
              }
            }}
          >
            <option value="">{t("chat.manualConversation")}</option>
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.conversationId}>
                {conversation.title || conversation.sessionId || conversation.conversationId}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ChatTranscript client={client} messages={messages} />
      <ChatComposer
        text={text}
        busy={busy}
        attachments={attachments}
        onTextChange={setText}
        onAttachmentsChange={setAttachments}
        onSend={() => void send()}
      />
    </section>
  );
}
