import { CheckCircle2, Search, Trash2 } from "lucide-react";
import type { SearchProvider } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type SearchProviderListProps = {
  providers: SearchProvider[];
  activeProviderId: string;
  onActivate: (providerId: string) => void;
  onTest: (providerId: string) => void;
  onDelete: (providerId: string) => void;
};

export function SearchProviderList({
  providers,
  activeProviderId,
  onActivate,
  onTest,
  onDelete
}: SearchProviderListProps) {
  const { t } = useI18n();

  return (
    <div className="search-provider-list">
      {providers.map((provider) => {
        const active = provider.id === activeProviderId;
        return (
          <div className="search-provider-row" key={provider.id}>
            <div>
              <strong>{provider.name}</strong>
              <span>{provider.providerType}</span>
              {provider.baseUrl && <span>{provider.baseUrl}</span>}
              <span>{provider.hasCredential ? t("common.encryptedKey") : t("common.noKey")}</span>
            </div>
            <StatusBadge value={provider.status} />
            {active && <CheckCircle2 size={17} />}
            <ToolbarButton
              label={t("search.testSearch")}
              icon={Search}
              onClick={() => onTest(provider.id)}
            />
            <ToolbarButton
              label={t("common.activate")}
              icon={CheckCircle2}
              disabled={active}
              onClick={() => onActivate(provider.id)}
            />
            <ToolbarButton
              label={t("common.delete")}
              icon={Trash2}
              variant="danger"
              onClick={() => onDelete(provider.id)}
            />
          </div>
        );
      })}
      {providers.length === 0 && <EmptyState label={t("search.noProviders")} />}
    </div>
  );
}
