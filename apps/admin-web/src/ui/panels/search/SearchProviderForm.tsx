import type { SearchProvider } from "../../../api/types";

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
  return (
    <div className="search-provider-form">
      <label>
        Name
        <input
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
        />
      </label>
      <label>
        Provider
        <select
          value={draft.providerType}
          onChange={(event) => {
            onDraftChange({
              ...draft,
              providerType: event.target.value as SearchProvider["providerType"]
            });
          }}
        >
          <option value="tavily">Tavily</option>
        </select>
      </label>
      <label>
        Base URL
        <input
          value={draft.baseUrl}
          onChange={(event) => onDraftChange({ ...draft, baseUrl: event.target.value })}
          placeholder="https://api.tavily.com/search"
        />
      </label>
      <label>
        API key
        <input
          type="password"
          value={draft.apiKey}
          onChange={(event) => onDraftChange({ ...draft, apiKey: event.target.value })}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        Save
      </button>
    </div>
  );
}
