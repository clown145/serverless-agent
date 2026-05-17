import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ModelCatalogItem,
  ModelProvider,
  ModelRole,
  ModelRoleSettings,
  ModelRoleSettingsUpdate,
  ModelSettings,
  AgentModelConfig
} from "../../api/types";
import { ToolbarButton } from "../ToolbarButton";
import { useI18n } from "../i18n/I18nProvider";
import { modelKey, parseModelKey } from "./models/modelSelection";
import type { PanelProps } from "./types";
import { ModelRolePicker } from "./model-config/ModelRolePicker";
import { ModelBehaviorSettings } from "./model-config/ModelBehaviorSettings";
import { MODEL_ROLE_DEFINITIONS } from "./model-config/modelRoleDefinitions";

export function ModelConfigPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<ModelCatalogItem[]>([]);
  const [settings, setSettings] = useState<ModelSettings>();
  const [roles, setRoles] = useState<ModelRoleSettings>({});
  const [config, setConfig] = useState<AgentModelConfig>({ imageCaptionEnabled: false });
  const [draft, setDraft] = useState<Record<ModelRole, string>>({
    default: "",
    summary: "",
    vision: ""
  });

  const enabledCount = useMemo(
    () => models.filter((model) => model.status === "enabled").length,
    [models]
  );

  async function load() {
    try {
      const result = await client.getModelRoleSettings();
      setProviders(result.providers);
      setModels(result.models);
      setSettings(result.settings);
      setRoles(result.roles);
      setConfig(result.config);
      setDraft(toDraft(result.settings, result.roles));
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load model config", "error");
    }
  }

  async function save() {
    try {
      const result = await client.updateModelRoleSettings(toPayload(draft), config);
      setProviders(result.providers);
      setModels(result.models);
      setSettings(result.settings);
      setRoles(result.roles);
      setConfig(result.config);
      setDraft(toDraft(result.settings, result.roles));
      notify(t("modelConfig.saved"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save model config", "error");
    }
  }

  function updateRole(role: ModelRole, value: string) {
    setDraft((current) => ({ ...current, [role]: value }));
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>{t("modelConfig.title")}</h1>
          <p>{t("modelConfig.subtitle", { count: enabledCount })}</p>
        </div>
        <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="model-role-list">
        {MODEL_ROLE_DEFINITIONS.map((definition) => (
          <ModelRolePicker
            key={definition.role}
            definition={definition}
            models={models}
            providers={providers}
            value={draft[definition.role]}
            onChange={updateRole}
          />
        ))}
        <ModelBehaviorSettings config={config} onChange={setConfig} />
      </div>

      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => void save()}>
          {t("common.save")}
        </button>
      </div>
    </section>
  );
}

function toDraft(
  settings: ModelSettings | undefined,
  roles: ModelRoleSettings
): Record<ModelRole, string> {
  return {
    default: modelKey(settings?.providerId, settings?.modelId),
    summary: modelKey(roles.summary?.providerId, roles.summary?.modelId),
    vision: modelKey(roles.vision?.providerId, roles.vision?.modelId)
  };
}

function toPayload(draft: Record<ModelRole, string>): ModelRoleSettingsUpdate {
  return {
    default: selectionFromKey(draft.default) ?? undefined,
    summary: selectionFromKey(draft.summary) ?? null,
    vision: selectionFromKey(draft.vision) ?? null
  };
}

function selectionFromKey(value: string): { providerId: string; modelId: string } | undefined {
  const parsed = parseModelKey(value);
  return parsed.providerId && parsed.modelId
    ? { providerId: parsed.providerId, modelId: parsed.modelId }
    : undefined;
}
