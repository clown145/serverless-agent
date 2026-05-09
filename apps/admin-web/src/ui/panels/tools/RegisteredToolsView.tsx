import type { ToolCatalogItem } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { JsonBlock } from "../../JsonBlock";
import { StatusBadge } from "../../StatusBadge";

type RegisteredToolsViewProps = {
  tools: ToolCatalogItem[];
  selectedName: string;
  onSelect: (name: string) => void;
};

export function RegisteredToolsView({
  tools,
  selectedName,
  onSelect
}: RegisteredToolsViewProps) {
  const { t } = useI18n();
  const selectedTool =
    tools.find((tool) => tool.name === selectedName) ?? tools[0];

  return (
    <div className="tools-layout">
      <div className="tool-list">
        {tools.map((tool) => (
          <button
            className={`tool-row ${selectedTool?.name === tool.name ? "selected" : ""}`}
            key={tool.name}
            type="button"
            onClick={() => onSelect(tool.name)}
          >
            <div>
              <strong>{tool.title ?? tool.name}</strong>
              <span>{tool.name}</span>
            </div>
            <StatusBadge value={tool.source.type} />
          </button>
        ))}
      </div>

      {selectedTool && (
        <div className="tool-detail">
          <div>
            <strong>{selectedTool.title ?? selectedTool.name}</strong>
            <span>{selectedTool.description}</span>
          </div>
          <div className="tool-meta">
            <StatusBadge value={selectedTool.source.type} />
            <StatusBadge value={selectedTool.sideEffect} />
            <span>{selectedTool.source.name}</span>
            <span>{t("common.level", { level: selectedTool.permission.level })}</span>
            <span>{selectedTool.timeoutMs}ms</span>
          </div>
          <JsonBlock
            value={{
              inputSchema: selectedTool.inputSchema,
              outputSchema: selectedTool.outputSchema,
              annotations: selectedTool.annotations,
              scopes: selectedTool.permission.scopes
            }}
          />
        </div>
      )}
    </div>
  );
}
