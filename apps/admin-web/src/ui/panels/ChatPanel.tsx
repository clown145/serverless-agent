import { Send } from "lucide-react";
import { useState } from "react";
import type { AdminClient } from "../../api/client";

type ChatPanelProps = {
  client: AdminClient;
  notify: (message: string, tone?: "ok" | "error") => void;
  onRun: (runId: string) => void;
};

export function ChatPanel({ client, notify, onRun }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState("webui:default");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) {
      return;
    }

    setBusy(true);
    try {
      const result = await client.sendMessage({ text, conversationId });
      const runId = result.result?.runId;
      setText("");
      notify(runId ? `Run ${runId}` : "Message sent", "ok");
      if (runId) {
        onRun(runId);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Send failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel chat-panel">
      <header className="panel-header">
        <div>
          <h1>WebUI Chat</h1>
          <p>platform:webui</p>
        </div>
      </header>

      <div className="field-row">
        <label>
          Conversation
          <input value={conversationId} onChange={(event) => setConversationId(event.target.value)} />
        </label>
      </div>

      <div className="composer">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              void send();
            }
          }}
        />
        <button className="primary-button" type="button" onClick={send} disabled={busy}>
          <Send size={16} />
          Send
        </button>
      </div>
    </section>
  );
}
