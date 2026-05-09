import type { ChatMessage } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";

type ChatTranscriptProps = {
  messages: ChatMessage[];
};

export function ChatTranscript({ messages }: ChatTranscriptProps) {
  const { t } = useI18n();

  if (messages.length === 0) {
    return <EmptyState label={t("chat.noMessages")} />;
  }

  return (
    <div className="chat-transcript">
      {messages.map((message) => (
        <article className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-bubble">
            <span className="chat-message-meta">
              {message.role === "assistant" ? t("chat.agent") : message.senderId}
            </span>
            <p>{message.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
