# Development Guide

## 技术方向

默认使用 TypeScript 开发 Cloudflare Worker。

后续推荐技术栈：

- TypeScript
- Cloudflare Workers
- Cloudflare Queues
- Durable Objects 或 Cloudflare Agents
- D1
- 对象存储（默认 R2，可选 S3-compatible 或 D1 lite）
- KV
- Vitest
- Wrangler

## 基本原则

1. 入口轻，核心稳。
   Worker HTTP handler 只负责接入、校验、入队、返回。

2. 状态外置。
   不依赖内存保存业务状态。任何需要恢复的数据都写入 D1、对象存储或 DO storage。

3. 工具受控。
   模型不能直接执行动作，只能请求 tool call。tool call 必须经过权限检查和审计。

4. 失败可恢复。
   每个 run step 都要记录状态，支持重试和幂等。

5. 模块边界清晰。
   adapter、core、tool、storage、scheduler 不互相混写。

## 命名规范

目录名使用 kebab-case：

```text
src/tools/git-sync/
src/adapters/telegram/
src/adapters/weixin-oc/
```

文件名使用 kebab-case：

```text
tool-registry.ts
internal-message.ts
run-state-machine.ts
```

类型名使用 PascalCase：

```ts
type InternalMessage = {}
type ToolCallRequest = {}
```

函数和变量使用 camelCase：

```ts
normalizeTelegramMessage()
createRunStep()
```

常量使用 UPPER_SNAKE_CASE：

```ts
const MAX_TOOL_RETRIES = 3
```

## 模块依赖方向

允许的依赖方向：

```text
worker -> adapters
worker -> agents
agents -> core
core -> tools interfaces
tools -> storage
scheduler -> storage
observability -> storage
```

禁止：

- `core` 直接依赖 Telegram、QQ、WeCom、Weixin OC 等具体平台协议。
- `core` 直接拼 SQL 或对象存储 key。
- `adapters` 调用模型。
- `tools` 直接修改 agent state，必须通过明确接口返回结果。
- `shared` 反向依赖业务模块。

## Adapter 规范

每个平台 adapter 至少提供：

```ts
normalizeInbound(payload): InternalMessage
buildOutbound(message): PlatformOutboundRequest
verifyRequest(request): Promise<boolean>
```

adapter 的目标是消除平台差异，不负责 agent 决策。

## Tool 规范

每个工具必须有独立目录或文件组：

```text
src/tools/{domain}/
  index.ts
  schema.ts
  executor.ts
  permissions.ts
  README.md
```

工具必须声明：

- 工具名。
- 输入 schema。
- 输出 schema。
- 权限级别。
- 是否有副作用。
- 幂等策略。
- 超时策略。
- 审计字段。

## Storage 规范

不要在业务模块散落 SQL、对象存储 key 或 KV key。

应当通过 repository 访问：

```ts
runsRepository.createRun(...)
vfsRepository.writeFile(...)
auditRepository.append(...)
```

对象存储 key 必须由统一 builder 生成：

```ts
buildAgentWorkspaceKey(agentId, path)
buildRunArtifactKey(runId, name)
```

## 错误处理

错误必须分类：

```text
ValidationError
PermissionDeniedError
TransientExternalError
PermanentExternalError
RateLimitError
InternalInvariantError
```

不要直接把第三方 API 错误返回给用户。先转成内部错误，再由响应层决定如何表达。

## 日志和审计

普通 debug log 可以短期保存。审计日志必须长期保存。

审计日志至少包含：

- actor。
- agent_id。
- run_id。
- tool_name。
- permission level。
- input summary。
- result summary。
- timestamp。
- idempotency key。

敏感字段必须脱敏。

## 测试策略

优先测试这些边界：

- adapter normalize。
- VFS path normalization。
- permission policy。
- tool idempotency。
- run state transition。
- schedule due-time calculation。
- storage key builder。

测试目录建议：

```text
tests/unit/
tests/integration/
tests/fixtures/
```

## 配置和密钥

- 本地使用 `.dev.vars`，不提交。
- 生产密钥使用 Cloudflare secrets。
- 代码中不硬编码 token。
- 文档中只写变量名，不写真实值。

推荐变量命名：

```text
AGENT_MASTER_KEY
OPENAI_API_KEY
TELEGRAM_BOT_TOKEN
QQ_BOT_SECRET
GITHUB_APP_ID
GITHUB_PRIVATE_KEY
EMAIL_PROVIDER_API_KEY
```

## 提交前检查

后续实现代码后，每次提交前至少运行：

```bash
npm run typecheck
npm run test
npm run lint
```

如果某个检查暂时无法运行，需要在提交说明或 PR 描述里写清楚原因。
