import type {
  SearchProviderRecord,
  SearchSettingsRecord
} from "../../../storage/repositories/search-types";

export type SearchProviderDto = Omit<SearchProviderRecord, "credentialId"> & {
  hasCredential: boolean;
};

export function toSearchProviderDto(provider: SearchProviderRecord): SearchProviderDto {
  return {
    id: provider.id,
    name: provider.name,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    status: provider.status,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    hasCredential: Boolean(provider.credentialId)
  };
}

export function toSearchSettingsDto(
  settings?: SearchSettingsRecord
): SearchSettingsRecord | undefined {
  return settings;
}
