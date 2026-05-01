import type { ModelProvider } from "../../../api/types";

export type ModelProviderDraft = {
  name: string;
  providerType: ModelProvider["providerType"];
  baseUrl: string;
  apiKey: string;
  authType: ModelProvider["authType"];
  authHeader: string;
  authQueryParam: string;
  modelListStrategy: ModelProvider["modelListStrategy"];
  chatProtocol: ModelProvider["chatProtocol"];
};

export function providerDraftDefaults(
  providerType: ModelProvider["providerType"]
): ModelProviderDraft {
  if (providerType === "gemini") {
    return {
      name: "Gemini",
      providerType,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: "",
      authType: "x-goog-api-key",
      authHeader: "",
      authQueryParam: "",
      modelListStrategy: "gemini",
      chatProtocol: "gemini-generate-content"
    };
  }

  if (providerType === "mock") {
    return {
      name: "Mock",
      providerType,
      baseUrl: "",
      apiKey: "",
      authType: "none",
      authHeader: "",
      authQueryParam: "",
      modelListStrategy: "static",
      chatProtocol: "openai-chat-completions"
    };
  }

  return {
    name: providerType === "custom" ? "Custom" : "OpenAI",
    providerType,
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    authType: "bearer",
    authHeader: "",
    authQueryParam: "",
    modelListStrategy: "openai",
    chatProtocol: "openai-chat-completions"
  };
}
