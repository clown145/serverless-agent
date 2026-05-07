import type { McpCallToolResult, McpTool } from "./types";
import { mcpPost, type McpHttpAuth, type McpSession } from "./http-transport";

const MCP_PROTOCOL_VERSION = "2025-06-18";

type InitializeResult = {
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
  serverInfo?: {
    name?: string;
    version?: string;
  };
};

type ToolsListResult = {
  tools?: McpTool[];
  nextCursor?: string;
};

export type McpDiscoveryResult = {
  protocolVersion: string;
  tools: McpTool[];
};

export async function discoverMcpHttpTools(input: {
  url: string;
  auth: McpHttpAuth;
}): Promise<McpDiscoveryResult> {
  const session = await initializeMcpHttpServer(input);
  await sendInitializedNotification({ ...input, session });
  const tools = await listMcpHttpTools({ ...input, session });

  return {
    protocolVersion: session.protocolVersion,
    tools
  };
}

export async function initializeMcpHttpServer(input: {
  url: string;
  auth: McpHttpAuth;
}): Promise<McpSession> {
  const response = await mcpPost<InitializeResult>({
    ...input,
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "serverless-agent",
        version: "0.1.0"
      }
    }
  });

  return {
    protocolVersion: response.result?.protocolVersion ?? MCP_PROTOCOL_VERSION,
    sessionId: response.sessionId
  };
}

export async function listMcpHttpTools(input: {
  url: string;
  auth: McpHttpAuth;
  session: McpSession;
}): Promise<McpTool[]> {
  const tools: McpTool[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const response = await mcpPost<ToolsListResult>({
      ...input,
      id: page + 2,
      method: "tools/list",
      params: cursor ? { cursor } : {}
    });
    tools.push(...(response.result?.tools ?? []));
    cursor = response.result?.nextCursor;

    if (!cursor) {
      return tools;
    }
  }

  throw new Error("MCP tools/list returned too many pages");
}

export async function callMcpHttpTool(input: {
  url: string;
  auth: McpHttpAuth;
  name: string;
  arguments?: Record<string, unknown>;
}): Promise<McpCallToolResult> {
  const session = await initializeMcpHttpServer(input);
  await sendInitializedNotification({ ...input, session });
  const response = await mcpPost<McpCallToolResult>({
    ...input,
    session,
    id: 2,
    method: "tools/call",
    params: {
      name: input.name,
      arguments: input.arguments ?? {}
    }
  });

  return response.result ?? { content: [] };
}

async function sendInitializedNotification(input: {
  url: string;
  auth: McpHttpAuth;
  session: McpSession;
}): Promise<void> {
  await mcpPost({
    ...input,
    method: "notifications/initialized"
  });
}
