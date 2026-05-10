import type {
  ConversationSettings,
  ModelCatalogItem,
  ModelProvider
} from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { modelKey, modelLabel } from "./conversationModelOptions";

export type ConversationDraft = {
  title: string;
  historyLimit: number;
  summaryEnabled: boolean;
  modelKey: string;
  summaryModelKey: string;
};

type ConversationEditorProps = {
  conversation?: ConversationSettings;
  draft: ConversationDraft;
  providers: ModelProvider[];
  models: ModelCatalogItem[];
  onDraftChange: (draft: ConversationDraft) => void;
  onSave: () => void;
  onCompact: () => void;
};

export function conversationToDraft(conversation: ConversationSettings): ConversationDraft {
  return {
    title: conversation.title ?? "",
    historyLimit: conversation.historyLimit,
    summaryEnabled: conversation.summaryEnabled,
    modelKey: modelKey(conversation.modelProviderId, conversation.modelId),
    summaryModelKey: modelKey(conversation.summaryProviderId, conversation.summaryModelId)
  };
}

export function ConversationEditor({
  conversation,
  draft,
  providers,
  models,
  onDraftChange,
  onSave,
  onCompact
}: ConversationEditorProps) {
  const { t } = useI18n();

  if (!conversation) {
    return <div className="conversation-editor empty">{t("conversations.selectOne")}</div>;
  }

  return (
    <div className="conversation-editor">
      <div className="conversation-meta">
        <strong>{conversation.conversationId}</strong>
        <span>{conversation.platform} / {conversation.rootConversationId}</span>
      </div>

      <div className="conversation-form-grid">
        <label>
          {t("conversations.titleLabel")}
          <input
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          />
        </label>
        <label>
          {t("conversations.historyLimit")}
          <input
            max="80"
            min="4"
            type="number"
            value={draft.historyLimit}
            onChange={(event) =>
              onDraftChange({ ...draft, historyLimit: Number(event.target.value) })
            }
          />
        </label>
        <label>
          {t("conversations.model")}
          <select
            value={draft.modelKey}
            onChange={(event) => onDraftChange({ ...draft, modelKey: event.target.value })}
          >
            <option value="">{t("conversations.defaultModel")}</option>
            {models.map((model) => (
              <option key={model.id} value={modelKey(model.providerId, model.modelId)}>
                {modelLabel(model, providers)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("conversations.summaryModel")}
          <select
            value={draft.summaryModelKey}
            onChange={(event) =>
              onDraftChange({ ...draft, summaryModelKey: event.target.value })
            }
          >
            <option value="">{t("conversations.defaultModel")}</option>
            {models.map((model) => (
              <option key={model.id} value={modelKey(model.providerId, model.modelId)}>
                {modelLabel(model, providers)}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            checked={draft.summaryEnabled}
            type="checkbox"
            onChange={(event) =>
              onDraftChange({ ...draft, summaryEnabled: event.target.checked })
            }
          />
          {t("conversations.summaryEnabled")}
        </label>
      </div>

      <div className="button-row">
        <button className="primary-button" type="button" onClick={onSave}>
          {t("common.save")}
        </button>
        <button className="secondary-button" type="button" onClick={onCompact}>
          {t("conversations.compactNow")}
        </button>
      </div>

      <div className="conversation-summary">
        <strong>{t("conversations.summary")}</strong>
        <pre>{conversation.summaryText || t("conversations.noSummary")}</pre>
      </div>
    </div>
  );
}
