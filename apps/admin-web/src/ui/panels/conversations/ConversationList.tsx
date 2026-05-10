import { MessageSquare } from "lucide-react";
import type { ConversationSettings } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";
import { useI18n } from "../../i18n/I18nProvider";

type ConversationListProps = {
  conversations: ConversationSettings[];
  selectedId?: string;
  onSelect: (conversation: ConversationSettings) => void;
  onOpenChat: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onOpenChat
}: ConversationListProps) {
  const { t } = useI18n();

  if (conversations.length === 0) {
    return <EmptyState label={t("conversations.noConversations")} />;
  }

  return (
    <div className="conversation-list">
      {conversations.map((conversation) => (
        <div
          className={`conversation-row ${selectedId === conversation.id ? "selected" : ""}`}
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSelect(conversation);
            }
          }}
        >
          <div>
            <strong>{conversation.title || conversation.sessionId}</strong>
            <span>{conversation.conversationId}</span>
            <span>{conversation.updatedAt}</span>
          </div>
          <StatusBadge value={conversation.platform} />
          <ToolbarButton
            label={t("conversations.openChat")}
            icon={MessageSquare}
            onClick={() => onOpenChat(conversation.conversationId)}
          />
        </div>
      ))}
    </div>
  );
}
