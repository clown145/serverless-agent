import type { JsonSchema } from "../../core/model/types";
import type { ToolAnnotations } from "../types";

export type McpTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
};

export type McpContentBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image" | "audio";
      data: string;
      mimeType: string;
    }
  | {
      type: "resource_link";
      uri: string;
      name?: string;
      description?: string;
      mimeType?: string;
    }
  | {
      type: "resource";
      resource: Record<string, unknown>;
    };

export type McpCallToolInput = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type McpCallToolResult = {
  content: McpContentBlock[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type McpCallTool = (
  input: McpCallToolInput
) => Promise<McpCallToolResult>;
