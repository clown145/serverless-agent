export type ApiResult<T> = T & { ok: boolean };

export type RunListItem = {
  id: string;
  agentId: string;
  conversationId?: string;
  triggerMessageId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type RunDetails = {
  run: Record<string, unknown>;
  steps: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
};

export type ChatMessage = {
  id: string;
  agentId: string;
  conversationId: string;
  platform: "telegram" | "qq" | "webhook" | "admin" | "webui";
  platformMessageId: string;
  senderId: string;
  role: "user" | "assistant";
  kind: string;
  text?: string;
  receivedAt: string;
  createdAt: string;
};

export type VfsEntry = {
  id: string;
  agentId: string;
  path: string;
  kind: "file" | "directory";
  storageKind?: "d1_text" | "r2_blob" | "legacy_r2" | "directory";
  mimeType?: string;
  size?: number;
  checksum?: string;
  version?: number;
  updatedAt: string;
};

export type VfsFile = {
  path: string;
  content: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  version: number;
};

export type VfsSearchMatch = {
  path: string;
  kind: "file" | "directory";
  line?: number;
  preview: string;
};

export type VfsCommandResult = {
  command: string;
  cwd: string;
  output: string;
};

export type Schedule = {
  id: string;
  agentId: string;
  status: string;
  dueAt: string;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
};

export type PendingAction = {
  id: string;
  agentId: string;
  runId: string;
  stepId: string;
  actorId: string;
  actorRole?: string;
  platform?: string;
  conversationId?: string;
  toolName: string;
  inputJson: string;
  status: string;
  reason?: string;
  expiresAt: string;
  createdAt: string;
};

export type PermissionPolicy = {
  id: string;
  agentId: string;
  subjectType: "agent" | "user" | "role" | "platform" | "conversation";
  subjectId: string;
  maxLevel: number;
  scopes: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelProvider = {
  id: string;
  name: string;
  providerType: "openai" | "gemini" | "mock" | "custom";
  baseUrl?: string;
  apiKeySecret?: string;
  credentialId?: string;
  hasCredential: boolean;
  authType: "none" | "bearer" | "x-goog-api-key" | "api-key-header" | "query-param";
  authHeader?: string;
  authQueryParam?: string;
  modelListStrategy: "openai" | "gemini" | "static";
  chatProtocol: "openai-chat-completions" | "gemini-generate-content";
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelCatalogItem = {
  id: string;
  providerId: string;
  modelId: string;
  displayName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelSettings = {
  agentId: string;
  providerId?: string;
  modelId?: string;
  updatedAt: string;
};

export type SetupStep = {
  id: "provider" | "credential" | "models" | "active_model";
  label: string;
  status: "done" | "pending";
  detail: string;
};

export type SetupStatus = {
  ready: boolean;
  steps: SetupStep[];
  activeProvider?: string;
  activeModel?: string;
};

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
};

export type ModelTestResult = {
  providerId: string;
  modelId: string;
  latencyMs: number;
  content?: string;
};

export type ToolSource = {
  type: "builtin" | "mcp";
  id: string;
  name: string;
};

export type ToolCatalogItem = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  source: ToolSource;
  permission: {
    level: number;
    scopes: string[];
    confirmationRequired?: boolean;
  };
  sideEffect: "none" | "workspace_write" | "external_write" | "dangerous";
  timeoutMs: number;
};

export type ToolResult = {
  status: "success" | "failed" | "permission_denied" | "needs_confirmation";
  output?: unknown;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export type ToolDebugCall = {
  toolName: string;
  runId: string;
  stepId: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  result: ToolResult;
};

export type ToolCallHistoryItem = {
  id: string;
  runId: string;
  stepId: string;
  agentId: string;
  toolName: string;
  status: string;
  inputJson: string;
  outputJson?: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
  input: unknown;
  output?: unknown;
  latencyMs?: number;
};

export type McpServer = {
  id: string;
  name: string;
  url: string;
  transport: "streamable-http";
  authType: "none" | "bearer" | "api-key-header";
  authHeader?: string;
  protocolVersion?: string;
  status: string;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  hasCredential: boolean;
};

export type McpTool = {
  id: string;
  serverId: string;
  toolName: string;
  internalName: string;
  title?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SearchProvider = {
  id: string;
  name: string;
  providerType: "tavily" | "custom";
  baseUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  hasCredential: boolean;
};

export type SearchSettings = {
  agentId: string;
  providerId?: string;
  updatedAt: string;
};

export type SearchResultItem = {
  title: string;
  url: string;
  content?: string;
  score?: number;
  rawContent?: string | null;
  favicon?: string;
};

export type SearchTestResult = {
  provider: "tavily" | "custom";
  query: string;
  answer?: string;
  results: SearchResultItem[];
  responseTime?: number;
  requestId?: string;
  usage?: unknown;
};

export type TelegramIntegration = {
  id: string;
  agentId: string;
  name: string;
  status: string;
  webhookSecretConfigured: boolean;
  hasCredential: boolean;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};
