import type {
  ApiResult,
  ChatMessage,
  ConversationSettings,
  DebugMessageItem,
  MessageAttachment,
  ModelCapability,
  ModelCatalogItem,
  DiagnosticCheck,
  DiagnosticSummary,
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
  SearchProvider,
  SearchSettings,
  SearchTestResult,
  SetupStatus,
  TelegramIntegration,
  ToolCatalogItem,
  ToolCallHistoryItem,
  ToolDebugCall,
  VfsEntry,
  VfsFile,
  VfsCommandResult,
  VfsSearchMatch,
  VfsBootstrapStatus
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

  async function requestBlob(path: string): Promise<Blob> {
    const headers = new Headers();
    const token = getToken().trim();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetch(path, { headers });
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response.blob();
  }

  return {
    sendMessage: (body: {
      text: string;
      agentId?: string;
      conversationId?: string;
      attachments?: Array<MessageAttachment & { dataBase64?: string }>;
    }) => {
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
    listMessages: (body: { conversationId: string; agentId?: string; limit?: number }) => {
      const params = new URLSearchParams({
        conversationId: body.conversationId,
        platform: "webui",
        limit: String(body.limit ?? 50)
      });
      if (body.agentId) {
        params.set("agentId", body.agentId);
      }

      return request<ApiResult<{ messages: ChatMessage[] }>>(
        `/admin/messages?${params.toString()}`
      );
    },
    getMessageAttachmentBlob: (messageId: string, attachmentId: string) => {
      return requestBlob(
        `/admin/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`
      );
    },
    listConversations: (body: {
      agentId?: string;
      platform?: ConversationSettings["platform"];
      rootConversationId?: string;
      limit?: number;
    } = {}) => {
      const params = new URLSearchParams();
      if (body.agentId) {
        params.set("agentId", body.agentId);
      }
      if (body.platform) {
        params.set("platform", body.platform);
      }
      if (body.rootConversationId) {
        params.set("rootConversationId", body.rootConversationId);
      }
      if (body.limit) {
        params.set("limit", String(body.limit));
      }
      const query = params.toString();

      return request<ApiResult<{ conversations: ConversationSettings[] }>>(
        `/admin/conversations${query ? `?${query}` : ""}`
      );
    },
    createConversation: (body: {
      agentId?: string;
      platform?: ConversationSettings["platform"];
      conversationId?: string;
      rootConversationId?: string;
      title?: string;
    }) => {
      return request<ApiResult<{ conversation: ConversationSettings }>>(
        "/admin/conversations",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
    },
    updateConversation: (
      conversationId: string,
      body: {
        title?: string | null;
        modelProviderId?: string | null;
        modelId?: string | null;
        historyLimit?: number;
        summaryEnabled?: boolean;
        summaryProviderId?: string | null;
        summaryModelId?: string | null;
      }
    ) => {
      return request<ApiResult<{ conversation: ConversationSettings }>>(
        `/admin/conversations/${encodeURIComponent(conversationId)}`,
        {
          method: "PUT",
          body: JSON.stringify(body)
        }
      );
    },
    compactConversation: (conversationId: string) => {
      return request<
        ApiResult<{
          conversation: ConversationSettings;
          summaryText?: string;
        }>
      >(`/admin/conversations/${encodeURIComponent(conversationId)}/compact`, {
        method: "POST",
        body: JSON.stringify({})
      });
    },
    listRuns: () => request<ApiResult<{ runs: RunListItem[] }>>("/admin/runs?limit=30"),
    getRun: (runId: string) => request<ApiResult<RunDetails>>(`/admin/runs/${runId}`),
    listDebugMessages: (body: { platform?: ChatMessage["platform"]; limit?: number } = {}) => {
      const params = new URLSearchParams();
      if (body.platform) {
        params.set("platform", body.platform);
      }
      if (body.limit) {
        params.set("limit", String(body.limit));
      }
      const query = params.toString();
      return request<ApiResult<{ messages: DebugMessageItem[] }>>(
        `/admin/debug/messages${query ? `?${query}` : ""}`
      );
    },
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
    mkdirVfs: (path: string) => {
      return request<ApiResult<{ entry: VfsEntry }>>("/admin/vfs", {
        method: "POST",
        body: JSON.stringify({ action: "mkdir", path })
      });
    },
    deleteVfs: (path: string, recursive = false) => {
      const params = new URLSearchParams({ path });
      if (recursive) {
        params.set("recursive", "true");
      }

      return request<ApiResult<{ result: { deleted: number } }>>(
        `/admin/vfs?${params.toString()}`,
        { method: "DELETE" }
      );
    },
    moveVfs: (fromPath: string, toPath: string) => {
      return request<ApiResult<{ entry: VfsEntry }>>("/admin/vfs", {
        method: "POST",
        body: JSON.stringify({ action: "move", fromPath, toPath })
      });
    },
    searchVfs: (body: { path: string; query: string }) => {
      const params = new URLSearchParams({
        mode: "search",
        path: body.path,
        query: body.query
      });
      return request<ApiResult<{ matches: VfsSearchMatch[] }>>(
        `/admin/vfs?${params.toString()}`
      );
    },
    runVfsCommand: (body: { command: string; cwd?: string }) => {
      return request<ApiResult<{ result: VfsCommandResult }>>("/admin/vfs", {
        method: "POST",
        body: JSON.stringify({ action: "command", ...body })
      });
    },
    initializeVfs: () => {
      return request<ApiResult<{ status: VfsBootstrapStatus }>>("/admin/vfs", {
        method: "POST",
        body: JSON.stringify({ action: "initialize" })
      });
    },
    listSchedules: () => request<ApiResult<{ schedules: Schedule[] }>>("/admin/schedules"),
    createSchedule: (body: {
      title?: string;
      text: string;
      platform?: Schedule["platform"];
      conversationId?: string;
      actorId?: string;
      actorRole?: Schedule["actorRole"];
      modelProviderId?: string;
      modelId?: string;
      dueAt?: string;
      delaySeconds?: number;
      intervalSeconds?: number;
      maxAttempts?: number;
      retryDelaySeconds?: number;
    }) => {
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
    pauseSchedule: (id: string) => {
      return request<ApiResult<{ schedule: Schedule }>>(`/admin/schedules/${id}/pause`, {
        method: "POST"
      });
    },
    resumeSchedule: (id: string) => {
      return request<ApiResult<{ schedule: Schedule }>>(`/admin/schedules/${id}/resume`, {
        method: "POST"
      });
    },
    runScheduleNow: (id: string) => {
      return request<ApiResult<{ schedule: Schedule; eventId: string }>>(
        `/admin/schedules/${id}/run`,
        { method: "POST" }
      );
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
      return request<
        ApiResult<{
          checks: DiagnosticCheck[];
          summary: DiagnosticSummary;
          healthy: boolean;
        }>
      >(
        "/admin/diagnostics"
      );
    },
    getTelegramIntegrations: () => {
      return request<
        ApiResult<{
          integrations: TelegramIntegration[];
          webhookPath: string;
        }>
      >("/admin/platforms/telegram");
    },
    createTelegramIntegration: (body: {
      agentId?: string;
      name: string;
      botToken?: string;
      webhookSecret?: string;
      parseMode?: TelegramIntegration["parseMode"];
    }) => {
      return request<ApiResult<{ integration: TelegramIntegration }>>(
        "/admin/platforms/telegram",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
    },
    updateTelegramIntegration: (
      integrationId: string,
      body: { parseMode?: TelegramIntegration["parseMode"] }
    ) => {
      return request<ApiResult<{ integration: TelegramIntegration }>>(
        `/admin/platforms/telegram/${integrationId}`,
        {
          method: "PUT",
          body: JSON.stringify(body)
        }
      );
    },
    testTelegramIntegration: (integrationId: string) => {
      return request<ApiResult<{ integration: TelegramIntegration; bot: unknown; webhook: unknown }>>(
        `/admin/platforms/telegram/${integrationId}/test`,
        { method: "POST" }
      );
    },
    syncTelegramCommands: (integrationId: string) => {
      return request<ApiResult<{ integration: TelegramIntegration; commands: unknown[] }>>(
        `/admin/platforms/telegram/${integrationId}/commands`,
        { method: "POST" }
      );
    },
    setTelegramWebhook: (integrationId: string, webhookUrl?: string) => {
      return request<ApiResult<{ webhookUrl: string; webhook: unknown; commands?: unknown[] }>>(
        `/admin/platforms/telegram/${integrationId}/webhook`,
        {
          method: "POST",
          body: JSON.stringify({ webhookUrl: webhookUrl || undefined })
        }
      );
    },
    deleteTelegramWebhook: (integrationId: string) => {
      return request<ApiResult<{ webhook: unknown }>>(
        `/admin/platforms/telegram/${integrationId}/webhook`,
        { method: "DELETE" }
      );
    },
    deleteTelegramIntegration: (integrationId: string) => {
      return request<ApiResult<{ deleted: boolean }>>(
        `/admin/platforms/telegram/${integrationId}`,
        { method: "DELETE" }
      );
    },
    listTools: () => {
      return request<ApiResult<{ tools: ToolCatalogItem[] }>>("/admin/tools");
    },
    callTool: (body: {
      toolName: string;
      input: unknown;
      agentId?: string;
      actorId?: string;
      actorRole?: string;
      platform?: string;
      conversationId?: string;
      allowDangerous?: boolean;
    }) => {
      return request<ApiResult<{ call: ToolDebugCall }>>("/admin/tools/call", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    listToolCalls: (limit = 20) => {
      return request<ApiResult<{ calls: ToolCallHistoryItem[] }>>(
        `/admin/tools/calls?limit=${encodeURIComponent(String(limit))}`
      );
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
    getSearchProviders: () => {
      return request<
        ApiResult<{
          providers: SearchProvider[];
          settings?: SearchSettings;
        }>
      >("/admin/search-providers");
    },
    createSearchProvider: (body: {
      name: string;
      providerType: SearchProvider["providerType"];
      baseUrl?: string;
      apiKey?: string;
    }) => {
      return request<ApiResult<{ provider: SearchProvider }>>("/admin/search-providers", {
        method: "POST",
        body: JSON.stringify(body)
      });
    },
    activateSearchProvider: (providerId: string) => {
      return request<ApiResult<{ settings: SearchSettings }>>("/admin/search-providers", {
        method: "PUT",
        body: JSON.stringify({ providerId })
      });
    },
    updateSearchSettings: (body: { defaultMaxResults?: number }) => {
      return request<ApiResult<{ settings: SearchSettings }>>("/admin/search-providers", {
        method: "PUT",
        body: JSON.stringify(body)
      });
    },
    testSearchProvider: (providerId: string, body: { query: string; maxResults?: number }) => {
      return request<ApiResult<{ result: SearchTestResult }>>(
        `/admin/search-providers/${providerId}/test`,
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
    },
    deleteSearchProvider: (providerId: string) => {
      return request<ApiResult<{ deleted: boolean }>>(`/admin/search-providers/${providerId}`, {
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
    refreshProviderModelMetadata: (providerId: string, source = "openrouter") => {
      return request<
        ApiResult<{
          models: ModelCatalogItem[];
          matched: number;
          source: string;
        }>
      >(`/admin/model-providers/${providerId}/metadata`, {
        method: "POST",
        body: JSON.stringify({ source })
      });
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
    updateModelCapabilities: (modelCatalogId: string, capabilities: ModelCapability[]) => {
      return request<ApiResult<{ model: ModelCatalogItem }>>(
        `/admin/model-catalog/${encodeURIComponent(modelCatalogId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ capabilities })
        }
      );
    },
    updateModelStatus: (modelCatalogId: string, status: ModelCatalogItem["status"]) => {
      return request<ApiResult<{ model: ModelCatalogItem }>>(
        `/admin/model-catalog/${encodeURIComponent(modelCatalogId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ status })
        }
      );
    },
    deleteModelProvider: (id: string) => {
      return request<ApiResult<{ deleted: boolean }>>(`/admin/model-providers/${id}`, {
        method: "DELETE"
      });
    }
  };
}
