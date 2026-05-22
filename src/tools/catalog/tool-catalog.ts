import type { JsonSchema } from "../../core/model/types";
import type {
  RegisteredTool,
  ToolAnnotations,
  ToolDefinition,
  ToolSource
} from "../types";

export type StandardToolDefinition = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
};

export type ToolCatalogItem = StandardToolDefinition & {
  description: string;
  source: ToolSource;
  permission: ToolDefinition["permission"];
  platforms?: ToolDefinition["platforms"];
  behavior?: ToolDefinition["behavior"];
  sideEffect: ToolDefinition["sideEffect"];
  timeoutMs: number;
};

export function createToolCatalog(tools: RegisteredTool[]): ToolCatalogItem[] {
  return tools.map(toToolCatalogItem).sort(compareToolCatalogItems);
}

export function toToolCatalogItem(tool: RegisteredTool): ToolCatalogItem {
  return {
    ...toStandardToolDefinition(tool.definition),
    description: tool.definition.description,
    source: tool.source,
    permission: tool.definition.permission,
    platforms: tool.definition.platforms,
    behavior: tool.definition.behavior,
    sideEffect: tool.definition.sideEffect,
    timeoutMs: tool.definition.timeoutMs
  };
}

export function toStandardToolDefinition(
  definition: ToolDefinition
): StandardToolDefinition {
  return {
    name: definition.name,
    title: definition.title,
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    annotations: definition.annotations
  };
}

function compareToolCatalogItems(left: ToolCatalogItem, right: ToolCatalogItem): number {
  return `${left.source.type}:${left.name}`.localeCompare(
    `${right.source.type}:${right.name}`
  );
}
