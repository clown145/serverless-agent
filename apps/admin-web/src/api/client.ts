import type {
  ApiResult,
  ModelCatalogItem,
  DiagnosticCheck,
  McpServer,
  McpTool,
  ModelProvider,
  ModelSettings,
  ModelTestResult,
  PendingAction,
  PermissionPolicy,
  RunDetails,
  RunListItem,
  Schedule,
  SetupStatus,
  ToolCatalogItem,
  VfsEntry,
  VfsFile
} from "./types";

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient(getToken: () => string) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = getToken().trim();

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(path, { ...init, headers });
    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? data.message ?? response.statusText);
    }

    return data as T;
  }

  return {
    sendMessage: (body: { text: string; agentId?: string; conversationId?: string }) => {
      return request<ApiResult<{ eventId: string; result?: { runId?: string } }>>(
        "/admin/messages",
        {
          method: "POST",
          body: JSON.stringify({
            ...body,
            platform: "webui",
            mode: "sync"
          })
        }
      );
    },
    listRuns: () => request<ApiResult<{ runs: RunListItem[] }>>("/admin/runs?limit=30"),
    getRun: (runId: string) => request<ApiResult<RunDetails>>(`/admin/runs/${runId}`),
    listVfs: (path: string) => {
      return request<ApiResult<{ entries: VfsEntry[] }>>(
        `/admin/vfs?path=${encodeURIComponent(path)}`
      );
    },
    readVfsFile: (path: string) => {
      return request<ApiResult<{ file: VfsFile }>>(
        `/admin/vfs?mode=file&path=${encodeURIComponent(path)}`
      );
    },
    writeVfsFile: (body: { path: string; content: string; mimeType?: string }) => {
      return request<ApiResult<{ entry: VfsEntry }>>("/admin/vfs", {
        method: "PUT",
        body: JSON.stringify(body)
      });
    },
    listSchedules: () => request<ApiResult<{ schedules: Schedule[] }>>("/admin/schedules"),
    createSchedule: (body: { text: string; delaySeconds: number; intervalSeconds?: number }) => {
      return request<ApiResult<{ schedule: Schedule }>>("/admin/schedules", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    cancelSchedule: (id: string) => {
      return request<ApiResult<{ cancelled: boolean }>>(`/admin/schedules/${id}`, {
        method: "DELETE"
      });
    },
    listPendingActions: () => {
      return request<ApiResult<{ actions: PendingAction[] }>>("/admin/pending-actions");
    },
    confirmPendingAction: (id: string) => {
      return request<ApiResult<{ result: unknown }>>(`/admin/pending-actions/${id}/confirm`, {
        method: "POST"
      });
    },
    listPolicies: () => {
      return request<ApiResult<{ policies: PermissionPolicy[] }>>("/admin/permission-policies");
    },
    createPolicy: (body: {
      subjectType: PermissionPolicy["subjectType"];
      subjectId: string;
      maxLevel: number;
      scopes: string[];
    }) => {
      return request<ApiResult<{ policy: PermissionPolicy }>>("/admin/permission-policies", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    deletePolicy: (id: string) => {
      return request<ApiResult<{ deleted: boolean }>>(`/admin/permission-policies/${id}`, {
        method: "DELETE"
      });
    },
    getModelSettings: () => {
      return request<
        ApiResult<{
          providers: ModelProvider[];
          models: ModelCatalogItem[];
          settings?: ModelSettings;
        }>
      >("/admin/model-settings");
    },
    getSetupStatus: () => {
      return request<ApiResult<{ status: SetupStatus }>>("/admin/setup/status");
    },
    getDiagnostics: () => {
      return request<ApiResult<{ checks: DiagnosticCheck[]; healthy: boolean }>>(
        "/admin/diagnostics"
      );
    },
    listTools: () => {
      return request<ApiResult<{ tools: ToolCatalogItem[] }>>("/admin/tools");
    },
    listMcpServers: () => {
      return request<ApiResult<{ servers: McpServer[]; tools: McpTool[] }>>(
        "/admin/mcp/servers"
      );
    },
    createMcpServer: (body: {
      name: string;
      url: string;
      authType: McpServer["authType"];
      authHeader?: string;
      credential?: string;
    }) => {
      return request<ApiResult<{ server: McpServer }>>("/admin/mcp/servers", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    discoverMcpServerTools: (serverId: string) => {
      return request<ApiResult<{ protocolVersion: string; tools: McpTool[] }>>(
        `/admin/mcp/servers/${serverId}/discover`,
        { method: "POST" }
      );
    },
    setMcpToolStatus: (toolId: string, status: McpTool["status"]) => {
      return request<ApiResult<{ tool: McpTool }>>(`/admin/mcp/tools/${toolId}`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
    },
    deleteMcpServer: (serverId: string) => {
      return request<ApiResult<{ deleted: boolean }>>(`/admin/mcp/servers/${serverId}`, {
        method: "DELETE"
      });
    },
    createModelProvider: (body: {
      name: string;
      providerType: ModelProvider["providerType"];
      baseUrl?: string;
      apiKey?: string;
      authType?: ModelProvider["authType"];
      authHeader?: string;
      authQueryParam?: string;
      modelListStrategy?: ModelProvider["modelListStrategy"];
      chatProtocol?: ModelProvider["chatProtocol"];
    }) => {
      return request<ApiResult<{ provider: ModelProvider }>>("/admin/model-settings", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    refreshProviderModels: (providerId: string) => {
      return request<ApiResult<{ models: ModelCatalogItem[] }>>(
        `/admin/model-providers/${providerId}/refresh`,
        { method: "POST" }
      );
    },
    testProviderModel: (providerId: string, body: { modelId?: string; prompt?: string } = {}) => {
      return request<ApiResult<{ result: ModelTestResult }>>(
        `/admin/model-providers/${providerId}/test`,
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
    },
    activateModel: (body: { providerId: string; modelId: string }) => {
      return request<ApiResult<{ settings: ModelSettings }>>("/admin/model-settings", {
        method: "PUT",
        body: JSON.stringify(body)
      });
    },
    deleteModelProvider: (id: string) => {
      return request<ApiResult<{ deleted: boolean }>>(`/admin/model-providers/${id}`, {
        method: "DELETE"
      });
    }
  };
}
