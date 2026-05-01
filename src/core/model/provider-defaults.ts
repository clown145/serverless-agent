import type {
  ChatProtocol,
  ModelAuthType,
  ModelListStrategy,
  ModelProviderType
} from "../../storage/repositories/model-settings-types";

export type ProviderDefaults = {
  name: string;
  baseUrl?: string;
  authType: ModelAuthType;
  modelListStrategy: ModelListStrategy;
  chatProtocol: ChatProtocol;
};

export function modelProviderDefaults(type: ModelProviderType): ProviderDefaults {
  if (type === "gemini") {
    return {
      name: "Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      authType: "x-goog-api-key",
      modelListStrategy: "gemini",
      chatProtocol: "gemini-generate-content"
    };
  }

  if (type === "mock") {
    return {
      name: "Mock",
      authType: "none",
      modelListStrategy: "static",
      chatProtocol: "openai-chat-completions"
    };
  }

  return {
    name: type === "custom" ? "Custom" : "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    modelListStrategy: "openai",
    chatProtocol: "openai-chat-completions"
  };
}
