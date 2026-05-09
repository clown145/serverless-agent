import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminClient } from "../../api/client";
import type { ChatMessage } from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { ToolbarButton } from "../ToolbarButton";
import { ChatComposer } from "./chat/ChatComposer";
import { ChatTranscript } from "./chat/ChatTranscript";

type ChatPanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  onRun: (runId: string) => void;
};

export function ChatPanel({ client, notify, onRun }: ChatPanelProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState("webui:default");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastRunId, setLastRunId] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMessages() {
    try {
      const result = await client.listMessages({ conversationId });
      setMessages(result.messages);
    } catch (error) {
      notify(error instanceof Error ? error.message : t("chat.loadFailed"), "error");
    }
  }

  async function send() {
    if (!text.trim()) {
      return;
    }

    setBusy(true);
    try {
      const result = await client.sendMessage({ text, conversationId });
      const runId = result.result?.runId;
      setText("");
      setLastRunId(runId ?? "");
      await loadMessages();
      notify(runId ? t("chat.runCompleted", { runId }) : t("chat.messageSent"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : t("chat.sendFailed"), "error");
      await loadMessages();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, [conversationId]);

  function openLastRun() {
    if (lastRunId) {
      onRun(lastRunId);
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
          <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void loadMessages()} />
        </div>
      </header>

      <div className="field-row">
        <label>
          {t("chat.conversation")}
          <input value={conversationId} onChange={(event) => setConversationId(event.target.value)} />
        </label>
      </div>

      <ChatTranscript messages={messages} />
      <ChatComposer text={text} busy={busy} onTextChange={setText} onSend={() => void send()} />
    </section>
  );
}
