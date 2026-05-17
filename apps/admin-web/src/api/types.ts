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
  triggerMessage?: Record<string, unknown>;
  conversation?: Record<string, unknown>;
  diagnostics: {
    durationMs?: number;
    stepCount: number;
    modelCallCount: number;
    toolCallCount: number;
    failedStepCount: number;
    failedToolCallCount: number;
    lastError?: string;
  };
};

export type DebugMessageItem = {
  id: string;
  agentId: string;
  conversationId: string;
  platform: ChatMessage["platform"];
  platformMessageId: string;
  senderId: string;
  role: "user" | "assistant";
  kind: string;
  text?: string;
  rawRef?: string;
  receivedAt: string;
  createdAt: string;
  runId?: string;
  runStatus?: string;
  runUpdatedAt?: string;
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
  attachments: MessageAttachment[];
  receivedAt: string;
  createdAt: string;
};

export type MessageAttachment = {
  id: string;
  type: "image" | "file" | "audio" | "video" | "unknown";
  name?: string;
  mimeType?: string;
  size?: number;
  r2Key?: string;
  sourceUrl?: string;
};

export type ConversationSettings = {
  id: string;
  agentId: string;
  conversationId: string;
  sessionId: string;
  platform: "telegram" | "qq" | "webhook" | "admin" | "webui";
  rootConversationId: string;
  title?: string;
  modelProviderId?: string;
  modelId?: string;
  historyLimit: number;
  summaryEnabled: boolean;
  summaryProviderId?: string;
  summaryModelId?: string;
  summaryText?: string;
  summaryPreview?: string;
  summaryUpdatedAt?: string;
  compactedUntilMessageId?: string;
  createdAt: string;
  updatedAt: string;
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

export type VfsBootstrapStatus = {
  initialized: boolean;
  expected: number;
  existing: number;
  missingPaths: string[];
};

export type Schedule = {
  id: string;
  agentId: string;
  status: string;
  title?: string;
  dueAt: string;
  intervalSeconds?: number;
  platform?: ChatMessage["platform"];
  conversationId?: string;
  actorId?: string;
  actorRole?: "owner" | "admin" | "member" | "unknown";
  modelProviderId?: string;
  modelId?: string;
  maxAttempts: number;
  attemptCount: number;
  retryDelaySeconds: number;
  payloadJson: string;
  lastRunAt?: string;
  lastError?: string;
  lastRunId?: string;
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
  capabilities: ModelCapability[];
  capabilitiesSource: ModelCapabilitiesSource;
  contextWindow?: number;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown>;
  metadataSource?: ModelMetadataSource;
  metadataConfidence?: ModelMetadataConfidence;
  metadataFetchedAt?: string;
  status: ModelCatalogStatus;
  createdAt: string;
  updatedAt: string;
};

export type ModelCatalogStatus = "available" | "enabled" | "disabled" | "unavailable";

export type ModelCapability =
  | "tools"
  | "vision"
  | "long_context"
  | "structured_output"
  | "reasoning";

export type ModelCapabilitiesSource =
  | "manual"
  | "provider"
  | "models.dev"
  | "openrouter"
  | "inferred";

export type ModelMetadataSource = "provider" | "models.dev" | "openrouter" | "inferred";

export type ModelMetadataConfidence = "exact" | "alias" | "inferred" | "unknown";

export type ModelSettings = {
  agentId: string;
  providerId?: string;
  modelId?: string;
  updatedAt: string;
};

export type SetupStep = {
  id: "provider" | "credential" | "models" | "active_model" | "workspace";
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
  category:
    | "runtime"
    | "model"
    | "search"
    | "platforms"
    | "workspace"
    | "mcp"
    | "activity";
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
  action?: string;
};

export type DiagnosticSummary = {
  ok: number;
  warn: number;
  error: number;
  total: number;
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
  providerType: "tavily" | "exa" | "custom";
  baseUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  hasCredential: boolean;
};

export type SearchSettings = {
  agentId: string;
  providerId?: string;
  defaultMaxResults: number;
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
  provider: "tavily" | "exa" | "custom";
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
  parseMode: "none" | "HTML" | "MarkdownV2";
  hasCredential: boolean;
  lastCheckedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};
