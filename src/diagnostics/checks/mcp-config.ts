import { listMcpServerRecords } from "../../storage/repositories/mcp-servers-repository";
import { listMcpToolCatalog } from "../../storage/repositories/mcp-tools-repository";
import type { McpServerRecord } from "../../storage/repositories/mcp-types";
import type { Env } from "../../shared/types/env";
import { diagnosticOk, diagnosticWarn } from "../check-result";
import type { DiagnosticCheck } from "../types";

export async function checkMcpConfig(env: Env): Promise<DiagnosticCheck[]> {
  const [servers, tools] = await Promise.all([
    listMcpServerRecords(env.AGENT_DB),
    listMcpToolCatalog(env.AGENT_DB)
  ]);
  const activeServers = servers.filter((server) => server.status === "active");
  const enabledTools = tools.filter((tool) => tool.status === "enabled");

  return [
    serversCheck(activeServers.length),
    toolsCheck(enabledTools.length, activeServers.length),
    discoveryCheck(activeServers)
  ];
}

function serversCheck(count: number): DiagnosticCheck {
  return count
    ? diagnosticOk("mcp", "mcp_servers", "MCP servers", `${count} active server(s)`)
    : diagnosticOk("mcp", "mcp_servers", "MCP servers", "No MCP servers configured");
}

function toolsCheck(enabledCount: number, serverCount: number): DiagnosticCheck {
  if (enabledCount) {
    return diagnosticOk("mcp", "mcp_enabled_tools", "MCP tools", `${enabledCount} enabled tool(s)`);
  }

  return serverCount
    ? diagnosticWarn(
        "mcp",
        "mcp_enabled_tools",
        "MCP tools",
        "No MCP tools enabled",
        "Discover tools and enable the ones the agent can use"
      )
    : diagnosticOk("mcp", "mcp_enabled_tools", "MCP tools", "No external MCP tools enabled");
}

function discoveryCheck(activeServers: McpServerRecord[]): DiagnosticCheck {
  const erroredServers = activeServers.filter((server) => server.lastError);
  if (erroredServers.length) {
    return diagnosticWarn(
      "mcp",
      "mcp_last_discovery",
      "MCP discovery",
      erroredServers.map((server) => `${server.name}: ${server.lastError}`).join("; "),
      "Re-run MCP discovery"
    );
  }

  return activeServers.length
    ? diagnosticOk("mcp", "mcp_last_discovery", "MCP discovery", "No recorded MCP discovery errors")
    : diagnosticOk("mcp", "mcp_last_discovery", "MCP discovery", "No MCP discovery needed");
}
