import type { SearchProvider } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

export type SearchProviderDraft = {
  name: string;
  providerType: SearchProvider["providerType"];
  baseUrl: string;
  apiKey: string;
};

type SearchProviderFormProps = {
  draft: SearchProviderDraft;
  onDraftChange: (draft: SearchProviderDraft) => void;
  onSubmit: () => void;
};

export function SearchProviderForm({
  draft,
  onDraftChange,
  onSubmit
}: SearchProviderFormProps) {
  const { t } = useI18n();
  const defaultBaseUrl = defaultSearchBaseUrl(draft.providerType);

  return (
    <div className="search-provider-form">
      <label>
        {t("models.name")}
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        {t("search.provider")}
        <select
          value={draft.providerType}
          onChange={(event) => {
            const providerType = event.target.value as SearchProvider["providerType"];
            const shouldRename = draft.name === defaultSearchName(draft.providerType);
            onDraftChange({
              ...draft,
              providerType,
              name: shouldRename ? defaultSearchName(providerType) : draft.name
            });
          }}
        >
          <option value="tavily">Tavily</option>
          <option value="exa">Exa</option>
        </select>
      </label>
      <label>
        {t("models.baseUrl")}
        <input
          value={draft.baseUrl}
          onChange={(event) => onDraftChange({ ...draft, baseUrl: event.target.value })}
          placeholder={defaultBaseUrl}
        />
      </label>
      <label>
        {t("models.apiKey")}
        <input
          type="password"
          value={draft.apiKey}
          onChange={(event) => onDraftChange({ ...draft, apiKey: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        {t("common.save")}
      </button>
    </div>
  );
}

function defaultSearchName(providerType: SearchProvider["providerType"]): string {
  return providerType === "exa" ? "Exa" : "Tavily";
}

function defaultSearchBaseUrl(providerType: SearchProvider["providerType"]): string {
  return providerType === "exa"
    ? "https://api.exa.ai/search"
    : "https://api.tavily.com/search";
}
