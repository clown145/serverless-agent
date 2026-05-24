# Tool Contract Spec

## 概览

工具是 agent 能力的唯一执行入口。模型只能请求工具，不能直接操作外部系统。

## ToolDefinition

```ts
type ToolDefinition = {
  name: string
  title?: string
  description: string
  inputSchema: JsonSchema
  outputSchema?: JsonSchema
  annotations?: ToolAnnotations
  platforms?: Platform[]
  behavior?: ToolExecutionBehavior
  permission: PermissionRequirement
  sideEffect: "none" | "workspace_write" | "external_write" | "dangerous"
  timeoutMs: number
}
```

`platforms` 为空时表示所有平台可用；设置后 registry 会在执行前拒绝不匹配的平台。`behavior.preventsFinalResponse` 用于标记工具已经完成最终出站消息，agent loop 不再补发最终回复。

```ts
type ToolAnnotations = {
  title?: string
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

type ToolExecutionBehavior = {
  preventsFinalResponse?: boolean
}
```

## ToolCallRequest

```ts
type ToolCallRequest = {
  runId: string
  stepId: string
  toolName: string
  input: unknown
  actorId: string
  actorRole?: string
  platform?: string
  conversationId?: string
  allowDangerous?: boolean
  confirmedActionId?: string
}
```

Tool call id、created/completed timestamps 和 audit records 由 registry/repository 层生成和持久化，不由模型传入。

## ToolResult

```ts
type ToolResult = {
  status: "success" | "failed" | "permission_denied" | "needs_confirmation"
  output?: unknown
  error?: {
    code: string
    message: string
    retryable: boolean
  }
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

## 实现要求

- 输入必须 schema validate。
- 输出必须结构化。
- 副作用工具应尽量设计为幂等；需要确认的危险动作必须走 pending action。
- 权限检查在执行前完成。
- registry 记录 tool call，并在权限拒绝、pending confirmation 或执行完成时更新状态。
- 有副作用的执行结果写 audit log。
- 不把 secret 返回给模型。
- 当前工具 registry 不实现统一 retry policy；工具可通过 `error.retryable` 标记错误是否可重试，调用方决定是否重试。

## 相关文档

- [../src/tools/README.md](../src/tools/README.md)
- [../docs/architecture/TOOLS_AND_BOUNDARIES.md](../docs/architecture/TOOLS_AND_BOUNDARIES.md)
