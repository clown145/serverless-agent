# Tool Contract Spec

工具是 agent 能力的唯一执行入口。模型只能请求工具，不能直接操作外部系统。

## ToolDefinition

```ts
type ToolDefinition = {
  name: string
  description: string
  inputSchema: unknown
  outputSchema: unknown
  permission: PermissionRequirement
  sideEffect: "none" | "workspace_write" | "external_write" | "dangerous"
  timeoutMs: number
  retry: RetryPolicy
}
```

## ToolCallRequest

```ts
type ToolCallRequest = {
  id: string
  runId: string
  stepId: string
  toolName: string
  input: unknown
  actor: string
  idempotencyKey: string
  requestedAt: string
}
```

## ToolResult

```ts
type ToolResult = {
  toolCallId: string
  status: "success" | "failed" | "permission_denied" | "needs_confirmation"
  output?: unknown
  error?: {
    code: string
    message: string
    retryable: boolean
  }
  completedAt: string
}
```

## PermissionRequirement

```ts
type PermissionRequirement = {
  level: 0 | 1 | 2 | 3 | 4 | 5
  scopes: string[]
  confirmationRequired?: boolean
}
```

## RetryPolicy

```ts
type RetryPolicy = {
  maxAttempts: number
  backoff: "none" | "linear" | "exponential"
}
```

## 工具实现要求

- 输入必须 schema validate。
- 输出必须结构化。
- 副作用必须有幂等键。
- 权限检查在执行前完成。
- 执行前后都写 audit log。
- 不把 secret 返回给模型。
