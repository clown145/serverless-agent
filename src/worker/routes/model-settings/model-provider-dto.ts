import type { ModelProviderRecord } from "../../../storage/repositories/model-settings-types";

export function toProviderDto(provider: ModelProviderRecord) {
  return {
    ...provider,
    hasCredential: Boolean(provider.credentialId)
  };
}
