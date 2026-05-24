import { Check, X } from "lucide-react";
import type { ToolCatalogItem } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";

type PermissionScopePickerProps = {
  tools: ToolCatalogItem[];
  selectedScopes: string[];
  onSelectedScopesChange: (scopes: string[]) => void;
  maxLevel: number;
  onMaxLevelChange: (level: number) => void;
  manualScopes: string;
  onManualScopesChange: (scopes: string) => void;
};

type ScopeGrant = {
  id: string;
  labelKey: string;
  detailKey: string;
  level: number;
  scopes: string[];
};

const quickGrants: ScopeGrant[] = [
  {
    id: "workspace-read",
    labelKey: "permissions.grantWorkspaceRead",
    detailKey: "permissions.grantWorkspaceReadDetail",
    level: 1,
    scopes: ["workspace:read"]
  },
  {
    id: "workspace-write",
    labelKey: "permissions.grantWorkspaceWrite",
    detailKey: "permissions.grantWorkspaceWriteDetail",
    level: 2,
    scopes: ["workspace:read", "workspace:write"]
  },
  {
    id: "web-search",
    labelKey: "permissions.grantSearch",
    detailKey: "permissions.grantSearchDetail",
    level: 2,
    scopes: ["web:search"]
  },
  {
    id: "message-send",
    labelKey: "permissions.grantMessaging",
    detailKey: "permissions.grantMessagingDetail",
    level: 3,
    scopes: ["message:send", "message:send_file", "message:send_image", "message:send_buttons"]
  },
  {
    id: "schedule-manage",
    labelKey: "permissions.grantSchedule",
    detailKey: "permissions.grantScheduleDetail",
    level: 3,
    scopes: ["schedule:read", "schedule:write"]
  }
];

export function PermissionScopePicker({
  tools,
  selectedScopes,
  onSelectedScopesChange,
  maxLevel,
  onMaxLevelChange,
  manualScopes,
  onManualScopesChange
}: PermissionScopePickerProps) {
  const { t } = useI18n();
  const mcpTools = tools.filter((tool) => tool.source.type === "mcp");
  const builtinTools = tools.filter((tool) => tool.source.type === "builtin");
  const grants = [
    ...quickGrants,
    createToolGroupGrant(
      "builtin",
      "permissions.grantBuiltinTools",
      "permissions.grantBuiltinToolsDetail",
      builtinTools
    ),
    createToolGroupGrant(
      "mcp",
      "permissions.grantMcpTools",
      "permissions.grantMcpToolsDetail",
      mcpTools
    )
  ].filter((grant): grant is ScopeGrant => Boolean(grant));

  function addGrant(grant: ScopeGrant) {
    addScopes(grant.scopes, grant.level);
  }

  function addScopes(scopes: string[], level: number) {
    onSelectedScopesChange(mergeScopes(selectedScopes, scopes));
    if (level > maxLevel) {
      onMaxLevelChange(level);
    }
  }

  function removeScopes(scopes: string[]) {
    const blocked = new Set(scopes);
    onSelectedScopesChange(selectedScopes.filter((scope) => !blocked.has(scope)));
  }

  function toggleTool(tool: ToolCatalogItem) {
    if (isToolSelected(tool, selectedScopes, maxLevel)) {
      removeScopes(tool.permission.scopes);
      return;
    }

    addScopes(tool.permission.scopes, tool.permission.level);
  }

  return (
    <div className="permission-scope-picker">
      <div className="permission-picker-head">
        <div>
          <strong>{t("permissions.scopePickerTitle")}</strong>
          <span>{t("permissions.scopePickerDetail")}</span>
        </div>
        <span className="level-pill">{t("permissions.autoLevel", { level: maxLevel })}</span>
      </div>

      <section className="permission-picker-section">
        <h2>{t("permissions.quickGrants")}</h2>
        <div className="permission-preset-grid">
          {grants.map((grant) => (
            <button
              className="permission-preset-button"
              key={grant.id}
              type="button"
              onClick={() => addGrant(grant)}
            >
              <strong>{t(grant.labelKey)}</strong>
              <span>{t(grant.detailKey)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="permission-picker-section">
        <h2>{t("permissions.toolGrants")}</h2>
        <div className="permission-tool-grid">
          {tools.map((tool) => {
            const selected = isToolSelected(tool, selectedScopes, maxLevel);
            return (
              <button
                className={`permission-tool-choice ${selected ? "selected" : ""}`}
                key={tool.name}
                type="button"
                onClick={() => toggleTool(tool)}
              >
                <span className="permission-choice-icon">{selected && <Check size={14} />}</span>
                <span>
                  <strong>{tool.title ?? tool.name}</strong>
                  <small>{tool.name}</small>
                </span>
                <span className="permission-tool-meta">
                  <StatusBadge value={tool.source.type} />
                  <small>{t("common.level", { level: tool.permission.level })}</small>
                </span>
              </button>
            );
          })}
        </div>
        {tools.length === 0 && <p className="muted-line">{t("permissions.noTools")}</p>}
      </section>

      <section className="permission-picker-section">
        <h2>{t("permissions.selectedScopes")}</h2>
        <div className="scope-chip-list">
          {selectedScopes.map((scope) => (
            <button
              className="scope-chip"
              key={scope}
              type="button"
              onClick={() => removeScopes([scope])}
              title={t("permissions.removeScope")}
            >
              <span>{scope}</span>
              <X size={13} />
            </button>
          ))}
          {selectedScopes.length === 0 && (
            <span className="muted-line">{t("permissions.noScopes")}</span>
          )}
        </div>
      </section>

      <label className="permission-manual-scopes">
        {t("permissions.manualScopes")}
        <input
          value={manualScopes}
          onChange={(event) => onManualScopesChange(event.target.value)}
          placeholder={t("permissions.manualScopesPlaceholder")}
        />
      </label>
    </div>
  );
}

function createToolGroupGrant(
  id: string,
  labelKey: string,
  detailKey: string,
  tools: ToolCatalogItem[]
): ScopeGrant | undefined {
  if (tools.length === 0) {
    return undefined;
  }

  return {
    id,
    labelKey,
    detailKey,
    level: Math.max(...tools.map((tool) => tool.permission.level)),
    scopes: mergeScopes(...tools.map((tool) => tool.permission.scopes))
  };
}

function isToolSelected(
  tool: ToolCatalogItem,
  selectedScopes: string[],
  maxLevel: number
): boolean {
  const selected = new Set(selectedScopes);
  return (
    maxLevel >= tool.permission.level &&
    tool.permission.scopes.every((scope) => selected.has(scope))
  );
}

function mergeScopes(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat())).sort();
}
