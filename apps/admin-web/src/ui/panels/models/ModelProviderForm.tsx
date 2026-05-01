import type { ModelProvider } from "../../../api/types";
import type { ModelProviderDraft } from "./modelDefaults";

const providerTypes: ModelProvider["providerType"][] = ["openai", "gemini", "custom", "mock"];
const authTypes: ModelProvider["authType"][] = [
  "bearer",
  "x-goog-api-key",
  "api-key-header",
  "query-param",
  "none"
];
const modelListStrategies: ModelProvider["modelListStrategy"][] = ["openai", "gemini", "static"];
const chatProtocols: ModelProvider["chatProtocol"][] = [
  "openai-chat-completions",
  "gemini-generate-content"
];

type ModelProviderFormProps = {
  draft: ModelProviderDraft;
  onProviderTypeChange: (value: ModelProvider["providerType"]) => void;
  onDraftChange: (draft: ModelProviderDraft) => void;
  onSubmit: () => void;
};

export function ModelProviderForm({
  draft,
  onProviderTypeChange,
  onDraftChange,
  onSubmit
}: ModelProviderFormProps) {
  function update<K extends keyof ModelProviderDraft>(key: K, value: ModelProviderDraft[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  return (
    <div className="form-grid model-form">
      <label>
        Type
        <select
          value={draft.providerType}
          onChange={(event) => onProviderTypeChange(event.target.value as ModelProvider["providerType"])}
        >
          {providerTypes.map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Name
        <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
      </label>
      <label>
        Base URL
        <input value={draft.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} />
      </label>
      <label>
        API key
        <input
          value={draft.apiKey}
          autoComplete="off"
          required={draft.authType !== "none"}
          type="password"
          onChange={(event) => update("apiKey", event.target.value)}
        />
      </label>
      <label>
        Auth
        <select
          value={draft.authType}
          onChange={(event) => update("authType", event.target.value as ModelProvider["authType"])}
        >
          {authTypes.map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Header
        <input
          value={draft.authHeader}
          onChange={(event) => update("authHeader", event.target.value)}
        />
      </label>
      <label>
        Query param
        <input
          value={draft.authQueryParam}
          onChange={(event) => update("authQueryParam", event.target.value)}
        />
      </label>
      <label>
        Models
        <select
          value={draft.modelListStrategy}
          onChange={(event) =>
            update("modelListStrategy", event.target.value as ModelProvider["modelListStrategy"])
          }
        >
          {modelListStrategies.map((strategy) => (
            <option value={strategy} key={strategy}>
              {strategy}
            </option>
          ))}
        </select>
      </label>
      <label>
        Protocol
        <select
          value={draft.chatProtocol}
          onChange={(event) =>
            update("chatProtocol", event.target.value as ModelProvider["chatProtocol"])
          }
        >
          {chatProtocols.map((protocol) => (
            <option value={protocol} key={protocol}>
              {protocol}
            </option>
          ))}
        </select>
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        Add
      </button>
    </div>
  );
}
