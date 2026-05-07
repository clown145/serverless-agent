import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminClient } from "../../api/client";
import type { ChatMessage } from "../../api/types";
import { ToolbarButton } from "../ToolbarButton";
import { ChatComposer } from "./chat/ChatComposer";
import { ChatTranscript } from "./chat/ChatTranscript";

type ChatPanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  onRun: (runId: string) => void;
};

export function ChatPanel({ client, notify, onRun }: ChatPanelProps) {
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
      notify(error instanceof Error ? error.message : "Failed to load messages", "error");
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
      notify(runId ? `Run ${runId} completed` : "Message sent", "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Send failed", "error");
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
          <h1>WebUI Chat</h1>
          <p>platform:webui</p>
        </div>
        <div className="tool-meta">
          {lastRunId && (
            <ToolbarButton label="Open run" icon={ExternalLink} onClick={openLastRun} />
          )}
          <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void loadMessages()} />
        </div>
      </header>

      <div className="field-row">
        <label>
          Conversation
          <input value={conversationId} onChange={(event) => setConversationId(event.target.value)} />
        </label>
      </div>

      <ChatTranscript messages={messages} />
      <ChatComposer text={text} busy={busy} onTextChange={setText} onSend={() => void send()} />
    </section>
  );
}
