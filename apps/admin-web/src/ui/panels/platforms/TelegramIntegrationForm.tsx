import { Plus } from "lucide-react";

export type TelegramIntegrationDraft = {
  agentId: string;
  name: string;
  botToken: string;
  webhookSecret: string;
};

type TelegramIntegrationFormProps = {
  draft: TelegramIntegrationDraft;
  onDraftChange: (draft: TelegramIntegrationDraft) => void;
  onSubmit: () => void;
};

export function TelegramIntegrationForm({
  draft,
  onDraftChange,
  onSubmit
}: TelegramIntegrationFormProps) {
  return (
    <div className="telegram-form">
      <label>
        Agent
        <input
          value={draft.agentId}
          placeholder="default"
          onChange={(event) => onDraftChange({ ...draft, agentId: event.target.value })}
        />
      </label>
      <label>
        Name
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Bot token
        <input
          type="password"
          value={draft.botToken}
          onChange={(event) => onDraftChange({ ...draft, botToken: event.target.value })}
        />
      </label>
      <label>
        Webhook secret
        <input
          value={draft.webhookSecret}
          placeholder="auto-generated"
          onChange={(event) => onDraftChange({ ...draft, webhookSecret: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        <Plus size={16} />
        Add
      </button>
    </div>
  );
}
