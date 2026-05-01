import type { ModelProvider } from "../../../api/types";

const providerTypes: ModelProvider["providerType"][] = ["openai", "gemini", "mock"];

type ModelProviderFormProps = {
  name: string;
  providerType: ModelProvider["providerType"];
  baseUrl: string;
  apiKeySecret: string;
  onNameChange: (value: string) => void;
  onProviderTypeChange: (value: ModelProvider["providerType"]) => void;
  onBaseUrlChange: (value: string) => void;
  onApiKeySecretChange: (value: string) => void;
  onSubmit: () => void;
};

export function ModelProviderForm({
  name,
  providerType,
  baseUrl,
  apiKeySecret,
  onNameChange,
  onProviderTypeChange,
  onBaseUrlChange,
  onApiKeySecretChange,
  onSubmit
}: ModelProviderFormProps) {
  return (
    <div className="form-grid model-form">
      <label>
        Type
        <select
          value={providerType}
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
        <input value={name} onChange={(event) => onNameChange(event.target.value)} />
      </label>
      <label>
        Base URL
        <input value={baseUrl} onChange={(event) => onBaseUrlChange(event.target.value)} />
      </label>
      <label>
        Secret binding
        <input
          value={apiKeySecret}
          autoCapitalize="characters"
          autoComplete="off"
          pattern="[A-Z_][A-Z0-9_]*"
          title="Use a binding name like GEMINI_API_KEY, not the secret value"
          onChange={(event) => onApiKeySecretChange(event.target.value)}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        Add
      </button>
    </div>
  );
}
