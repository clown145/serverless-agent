import { Edit3, Trash2 } from "lucide-react";
import type { EmailIntegration } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type EmailAccountListProps = {
  integrations: EmailIntegration[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEdit: (integration: EmailIntegration) => void;
  onDelete: (id: string) => void;
};

export function EmailAccountList({
  integrations,
  selectedId,
  onSelect,
  onEdit,
  onDelete
}: EmailAccountListProps) {
  if (!integrations.length) {
    return <EmptyState label="No email accounts configured" />;
  }

  return (
    <div className="email-account-list">
      {integrations.map((integration) => (
        <button
          className={`email-account-row${integration.id === selectedId ? " selected" : ""}`}
          key={integration.id}
          type="button"
          onClick={() => onSelect(integration.id)}
        >
          <span>
            <strong>{integration.name}</strong>
            <small>{integration.fromAddress}</small>
          </span>
          <StatusBadge value={integration.hasResendApiKey ? "active" : "pending"} />
          <span className="row-actions" onClick={(event) => event.stopPropagation()}>
            <ToolbarButton label="Edit" icon={Edit3} onClick={() => onEdit(integration)} />
            <ToolbarButton
              label="Delete"
              icon={Trash2}
              variant="danger"
              onClick={() => onDelete(integration.id)}
            />
          </span>
        </button>
      ))}
    </div>
  );
}
