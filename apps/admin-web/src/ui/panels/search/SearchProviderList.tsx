import { CheckCircle2, Search, Trash2 } from "lucide-react";
import type { SearchProvider } from "../../../api/types";
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
              <span>{provider.hasCredential ? "encrypted key" : "no key"}</span>
            </div>
            <StatusBadge value={provider.status} />
            {active && <CheckCircle2 size={17} />}
            <ToolbarButton
              label="Test search"
              icon={Search}
              onClick={() => onTest(provider.id)}
            />
            <ToolbarButton
              label="Activate"
              icon={CheckCircle2}
              disabled={active}
              onClick={() => onActivate(provider.id)}
            />
            <ToolbarButton
              label="Delete"
              icon={Trash2}
              variant="danger"
              onClick={() => onDelete(provider.id)}
            />
          </div>
        );
      })}
      {providers.length === 0 && <div className="empty-state">No search providers</div>}
    </div>
  );
}
