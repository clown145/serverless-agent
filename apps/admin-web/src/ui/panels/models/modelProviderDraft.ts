import type { ModelProvider } from "../../../api/types";
import { providerDraftDefaults, type ModelProviderDraft } from "./modelDefaults";

export type ModelProviderPayload = {
  name: string;
  providerType: ModelProvider["providerType"];
  baseUrl?: string;
  apiKey?: string;
  authType?: ModelProvider["authType"];
  authHeader?: string;
  authQueryParam?: string;
  modelListStrategy?: ModelProvider["modelListStrategy"];
  chatProtocol?: ModelProvider["chatProtocol"];
};

export function draftFromProvider(provider: ModelProvider): ModelProviderDraft {
  return {
    name: provider.name,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl ?? "",
    apiKey: "",
    authType: provider.authType,
    authHeader: provider.authHeader ?? "",
    authQueryParam: provider.authQueryParam ?? "",
    modelListStrategy: provider.modelListStrategy,
    chatProtocol: provider.chatProtocol
  };
}

export function initialProviderDraft(provider?: ModelProvider): ModelProviderDraft {
  return provider ? draftFromProvider(provider) : providerDraftDefaults("openai");
}

export function providerPayloadFromDraft(draft: ModelProviderDraft): ModelProviderPayload {
  return {
    name: draft.name,
    providerType: draft.providerType,
    baseUrl: draft.baseUrl || undefined,
    apiKey: draft.apiKey || undefined,
    authType: draft.authType,
    authHeader: draft.authHeader || undefined,
    authQueryParam: draft.authQueryParam || undefined,
    modelListStrategy: draft.modelListStrategy,
    chatProtocol: draft.chatProtocol
  };
}
