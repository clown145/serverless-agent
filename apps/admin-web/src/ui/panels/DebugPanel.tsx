import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { DebugMessageItem } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import { useI18n } from "../i18n/I18nProvider";
import type { PanelProps } from "./types";

type DebugPanelProps = PanelProps & {
  onRun: (runId: string) => void;
};

export function DebugPanel({ client, notify, onRun }: DebugPanelProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<DebugMessageItem[]>([]);
  const [platform, setPlatform] = useState<DebugMessageItem["platform"] | "">("");

  async function load() {
    try {
      const result = await client.listDebugMessages({
        platform: platform || undefined,
        limit: 80
      });
      setMessages(result.messages);
    } catch (error) {
      notify(error instanceof Error ? error.message : t("debug.loadFailed"), "error");
    }
  }

  useEffect(() => {
    void load();
  }, [platform]);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("debug.title")}</h1>
          <p>{t("common.loadedCount", { count: messages.length })}</p>
        </div>
        <div className="tool-meta">
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as typeof platform)}
          >
            <option value="">{t("debug.allPlatforms")}</option>
            <option value="telegram">Telegram</option>
            <option value="webui">WebUI</option>
            <option value="admin">Admin</option>
            <option value="qq">QQ</option>
            <option value="wecom">WeCom</option>
            <option value="webhook">Webhook</option>
          </select>
          <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
        </div>
      </header>

      <div className="debug-message-list">
        {messages.map((message) => (
          <article className="debug-message-row" key={message.id}>
            <div>
              <strong>
                {message.platform} / {message.kind}
              </strong>
              <span>{message.conversationId}</span>
              <p>{message.text || message.rawRef || message.id}</p>
              <span>{message.createdAt}</span>
            </div>
            <StatusBadge value={message.role} />
            {message.runStatus && <StatusBadge value={message.runStatus} />}
            {message.runId && (
              <ToolbarButton
                label={t("debug.openRun")}
                icon={ExternalLink}
                onClick={() => onRun(message.runId ?? "")}
              />
            )}
          </article>
        ))}
        {messages.length === 0 && <EmptyState label={t("debug.noMessages")} />}
      </div>
    </section>
  );
}
