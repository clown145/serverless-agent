import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ToolCatalogItem } from "../../api/types";
import { JsonBlock } from "../JsonBlock";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

export function ToolsPanel({ client, notify }: PanelProps) {
  const [tools, setTools] = useState<ToolCatalogItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolCatalogItem>();

  async function load() {
    try {
      const result = await client.listTools();
      setTools(result.tools);
      setSelectedTool((current) => {
        return result.tools.find((tool) => tool.name === current?.name) ?? result.tools[0];
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load tools", "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h1>Tools</h1>
          <p>{tools.length} registered</p>
        </div>
        <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void load()} />
      </header>

      <div className="tools-layout">
        <div className="tool-list">
          {tools.map((tool) => (
            <button
              className={`tool-row ${selectedTool?.name === tool.name ? "selected" : ""}`}
              key={tool.name}
              type="button"
              onClick={() => setSelectedTool(tool)}
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
              <span>level {selectedTool.permission.level}</span>
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
    </section>
  );
}
