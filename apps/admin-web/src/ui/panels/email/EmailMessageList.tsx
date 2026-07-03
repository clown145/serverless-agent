import type { EmailMessage } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { StatusBadge } from "../../StatusBadge";
import { formatEmailAddress } from "./emailFormat";

type EmailMessageListProps = {
  messages: EmailMessage[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function EmailMessageList({ messages, selectedId, onSelect }: EmailMessageListProps) {
  if (!messages.length) {
    return <EmptyState label="No email messages" />;
  }

  return (
    <div className="email-message-list">
      {messages.map((message) => (
        <button
          className={`email-message-row${message.id === selectedId ? " selected" : ""}`}
          key={message.id}
          type="button"
          onClick={() => onSelect(message.id)}
        >
          <span className="email-message-subject">{message.subject || "(no subject)"}</span>
          <span>
            {message.direction === "inbound"
              ? formatEmailAddress(message.from)
              : "To: " + message.to.map(formatEmailAddress).join(", ")}
          </span>
          <span>{message.snippet}</span>
          <StatusBadge value={message.status} />
        </button>
      ))}
    </div>
  );
}
