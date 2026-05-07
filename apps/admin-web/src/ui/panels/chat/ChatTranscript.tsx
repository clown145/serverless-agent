import type { ChatMessage } from "../../../api/types";
import { EmptyState } from "../../EmptyState";

type ChatTranscriptProps = {
  messages: ChatMessage[];
};

export function ChatTranscript({ messages }: ChatTranscriptProps) {
  if (messages.length === 0) {
    return <EmptyState label="No messages" />;
  }

  return (
    <div className="chat-transcript">
      {messages.map((message) => (
        <article className={`chat-message ${message.role}`} key={message.id}>
          <div className="chat-bubble">
            <span className="chat-message-meta">
              {message.role === "assistant" ? "agent" : message.senderId}
            </span>
            <p>{message.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
