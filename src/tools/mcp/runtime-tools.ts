import type { Env } from "../../shared/types/env";
import { listMcpServerRecords } from "../../storage/repositories/mcp-servers-repository";
import { listEnabledMcpToolCatalog } from "../../storage/repositories/mcp-tools-repository";
import type {
  McpServerRecord,
  McpToolRecord
} from "../../storage/repositories/mcp-types";
import type { RegisteredTool } from "../types";
import { createMcpRegisteredTool } from "./adapter";
import { resolveMcpCredential } from "./credential";
import { callMcpHttpTool } from "./http-client";
import type { McpTool } from "./types";

export async function createEnabledMcpTools(env: Env): Promise<RegisteredTool[]> {
  const [servers, tools] = await Promise.all([
    listMcpServerRecords(env.AGENT_DB),
    listEnabledMcpToolCatalog(env.AGENT_DB)
  ]);
  const serverById = new Map(
    servers
      .filter((server) => server.status === "active")
      .map((server) => [server.id, server])
  );

  const registered: RegisteredTool[] = [];
  for (const tool of tools) {
    const server = serverById.get(tool.serverId);
    if (!server) {
      continue;
    }

    const registeredTool = await createRuntimeMcpTool(env, server, tool).catch(() => undefined);
    if (registeredTool) {
      registered.push(registeredTool);
    }
  }

  return registered;
}

async function createRuntimeMcpTool(
  env: Env,
  server: McpServerRecord,
  tool: McpToolRecord
): Promise<RegisteredTool> {
  const credential = await resolveMcpCredential(env, server);

  return createMcpRegisteredTool({
    serverId: server.id,
    serverName: server.name,
    tool: toMcpTool(tool),
    callTool: (input) => {
      return callMcpHttpTool({
        url: server.url,
        auth: {
          authType: server.authType,
          authHeader: server.authHeader,
          credential
        },
        name: input.name,
        arguments: input.arguments
      });
    }
  });
}

function toMcpTool(record: McpToolRecord): McpTool {
  return {
    name: record.toolName,
    title: record.title,
    description: record.description,
    inputSchema: record.inputSchema,
    outputSchema: record.outputSchema,
    annotations: record.annotations
  };
}
