import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ConversationSettings,
  ModelCatalogItem,
  ModelProvider
} from "../../api/types";
import { ToolbarButton } from "../ToolbarButton";
import { useI18n } from "../i18n/I18nProvider";
import {
  ConversationEditor,
  conversationToDraft,
  type ConversationDraft
} from "./conversations/ConversationEditor";
import { ConversationList } from "./conversations/ConversationList";
import { parseModelKey } from "./conversations/conversationModelOptions";
import type { PanelProps } from "./types";

type ConversationsPanelProps = PanelProps & {
  onOpenConversation: (conversationId: string) => void;
};

const emptyDraft: ConversationDraft = {
  title: "",
  historyLimit: 16,
  summaryEnabled: true,
  modelKey: "",
  summaryModelKey: ""
};

export function ConversationsPanel({
  client,
  notify,
  onOpenConversation
}: ConversationsPanelProps) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ConversationSettings[]>([]);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<ConversationDraft>(emptyDraft);

  const selected = conversations.find((conversation) => conversation.id === selectedId);

  async function load() {
    try {
      const [conversationResult, modelResult] = await Promise.all([
        client.listConversations({ limit: 120 }),
        client.getModelSettings()
      ]);
      setConversations(conversationResult.conversations);
      setProviders(modelResult.providers);
      setModels(modelResult.models);
      const nextSelected =
        conversationResult.conversations.find((item) => item.id === selectedId) ??
        conversationResult.conversations[0];
      setSelectedId(nextSelected?.id ?? "");
      setDraft(nextSelected ? conversationToDraft(nextSelected) : emptyDraft);
    } catch (error) {
      notify(error instanceof Error ? error.message : t("conversations.loadFailed"), "error");
    }
  }

  async function createWebUiConversation() {
    try {
      const result = await client.createConversation({
        platform: "webui",
        title: t("conversations.newWebUi")
      });
      notify(t("conversations.created"), "ok");
      setSelectedId(result.conversation.id);
      setDraft(conversationToDraft(result.conversation));
      await load();
      setSelectedId(result.conversation.id);
      setDraft(conversationToDraft(result.conversation));
    } catch (error) {
      notify(error instanceof Error ? error.message : t("conversations.saveFailed"), "error");
    }
  }

  async function save() {
    if (!selected) {
      return;
    }

    const model = parseModelKey(draft.modelKey);
    const summaryModel = parseModelKey(draft.summaryModelKey);
    try {
      const result = await client.updateConversation(selected.conversationId, {
        title: draft.title || null,
        historyLimit: draft.historyLimit,
        summaryEnabled: draft.summaryEnabled,
        modelProviderId: model.providerId ?? null,
        modelId: model.modelId ?? null,
        summaryProviderId: summaryModel.providerId ?? null,
        summaryModelId: summaryModel.modelId ?? null
      });
      notify(t("conversations.saved"), "ok");
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === result.conversation.id ? result.conversation : conversation
        )
      );
      setDraft(conversationToDraft(result.conversation));
    } catch (error) {
      notify(error instanceof Error ? error.message : t("conversations.saveFailed"), "error");
    }
  }

  async function compact() {
    if (!selected) {
      return;
    }

    try {
      const result = await client.compactConversation(selected.conversationId);
      notify(t("conversations.compacted"), "ok");
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === result.conversation.id ? result.conversation : conversation
        )
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : t("conversations.compactFailed"), "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("conversations.title")}</h1>
          <p>{t("common.loadedCount", { count: conversations.length })}</p>
        </div>
        <div className="tool-meta">
          <ToolbarButton
            label={t("conversations.newWebUi")}
            icon={Plus}
            onClick={() => void createWebUiConversation()}
          />
          <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
        </div>
      </header>

      <div className="conversations-layout">
        <ConversationList
          conversations={conversations}
          onOpenChat={onOpenConversation}
          onSelect={(conversation) => {
            setSelectedId(conversation.id);
            setDraft(conversationToDraft(conversation));
          }}
          selectedId={selectedId}
        />
        <ConversationEditor
          conversation={selected}
          draft={draft}
          models={models}
          onCompact={() => void compact()}
          onDraftChange={setDraft}
          onSave={() => void save()}
          providers={providers}
        />
      </div>
    </section>
  );
}
