# 开发指南

## 概览

本项目使用 TypeScript 开发 Cloudflare Worker runtime。代码按职责边界拆分，核心要求是：入口轻、状态可恢复、工具受控、模块之间不泄露平台细节。

主要技术栈：

- TypeScript
- Cloudflare Workers
- Cloudflare Queues
- Durable Objects
- D1
- KV
- Object Storage，默认 R2，可选 S3-compatible 或 D1 lite
- Vitest
- Wrangler

## 基本原则

1. Worker 入口保持轻量，只做路由、鉴权、平台校验、标准化和入队。
2. 业务状态不能只存在内存里，需要恢复的数据写入 D1、对象存储或 DO storage。
3. 模型不能直接执行动作，只能请求 tool call。
4. tool call 必须经过 schema 校验、权限检查和 audit log。
5. 同一 agent 的关键状态更新由 Durable Object 串行处理。
6. `core` 保持平台无关，不能直接处理 Telegram、QQ、WeCom、Weixin OC 等协议细节。

## 命名规范

目录和文件使用 kebab-case：

```text
src/tools/git-sync/
src/adapters/telegram/
src/adapters/weixin-oc/
tool-registry.ts
internal-message.ts
```

类型使用 PascalCase：

```ts
type InternalMessage = {};
type ToolCallRequest = {};
```

函数和变量使用 camelCase：

```ts
normalizeTelegramMessage();
createRunStep();
```

常量使用 UPPER_SNAKE_CASE：

```ts
const MAX_TOOL_RETRIES = 3;
```

## 模块依赖

允许的依赖方向：

```text
worker -> adapters
worker -> agents
agents -> core
core -> shared/tool interfaces
tools -> storage
scheduler -> storage
observability -> storage
```

禁止：

- `core` 直接依赖具体平台协议。
- `core` 直接拼 SQL、对象存储 key 或平台 outbound payload。
- `adapters` 调用模型或决定 agent 行为。
- `tools` 直接修改 agent state。
- `shared` 反向依赖业务模块。

## Adapter 规范

adapter 的职责是消除平台差异。每个平台 adapter 至少应覆盖：

```ts
normalizeInbound(payload): InternalMessage
buildOutbound(message): PlatformOutboundRequest
verifyRequest(request): Promise<boolean>
```

adapter 可以处理平台签名、解密、消息格式、出站 payload 和平台能力差异。它不负责模型调用、权限决策或 run 状态机。

## Tool 规范

每个工具域应有独立目录或清晰的文件组：

```text
src/tools/{domain}/
  index.ts
  schema.ts
  executor.ts
  permissions.ts
  README.md
```

工具必须声明：

- 工具名；
- 输入 schema；
- 输出 schema；
- 权限等级和 scopes；
- side effect；
- 幂等策略；
- timeout；
- audit 字段。

## Storage 规范

业务模块不应散落 SQL、对象存储 key 或 KV key。访问持久化状态应通过 repository、service 或 storage helper。

示例：

```ts
runsRepository.createRun(...)
vfsRepository.writeFile(...)
auditRepository.append(...)
```

对象存储 key 必须由统一 builder 生成，避免不同模块各自拼接：

```ts
buildAgentWorkspaceKey(agentId, path);
buildRunArtifactKey(runId, name);
```

## 错误处理

错误应先转成内部错误类型，再由响应层决定怎么呈现。

常见分类：

```text
ValidationError
PermissionDeniedError
TransientExternalError
PermanentExternalError
RateLimitError
InternalInvariantError
```

不要把第三方 API 原始错误、secret、token 或完整请求体直接返回给用户或模型。

## 日志和审计

debug log 可以短期保存。audit log 用于追责和排障，应长期保存。

audit log 至少包含：

- actor；
- agent_id；
- run_id；
- tool_name；
- permission level；
- input summary；
- result summary；
- timestamp；
- idempotency key。

敏感字段必须脱敏或只记录摘要。

## 测试策略

优先覆盖这些边界：

- adapter normalize；
- VFS path normalization；
- permission policy；
- tool idempotency；
- run state transition；
- schedule due-time calculation；
- storage key builder；
- Durable Object mailbox 清理和恢复。

测试目录：

```text
tests/unit/
```

当前仓库以单元测试为主，尚未建立 `tests/integration` 或 `tests/fixtures` 目录。新增集成测试时再创建对应目录，并在测试文档中说明运行前置条件。

## 配置和密钥

- 本地使用 `.dev.vars`，不要提交。
- 生产密钥使用 Cloudflare secrets 或 GitHub Actions secrets。
- 代码中不要硬编码 token。
- 文档中只写变量名，不写真实值。

常见变量：

```text
AGENT_MASTER_KEY
INTERNAL_ADMIN_TOKEN
OPENAI_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
```

## Prompt 定制

默认提示词集中放在 `src/prompts/defaults`，运行时代码只 import `src/prompts/generated.ts`。这个生成文件由 `npm run prompts:build` 创建，不访问 D1、Durable Objects 或 VFS。

Fork 用户不要直接改 `defaults`，上游更新默认提示词时容易产生冲突。需要定制时，在 `src/prompts/overrides` 下创建同名 Markdown 文件，例如：

```text
src/prompts/overrides/agent/base.md
```

构建时同名 override 会覆盖 default。`npm run typecheck`、`npm run dev`、`npm run deploy` 和 GitHub Actions 部署流程都会先生成 prompt 常量。

## 提交前检查

常规代码变更至少运行：

```bash
npm run typecheck
npm test
```

影响部署 workflow 时额外运行：

```bash
npm run dry-run
```

如果某个检查无法运行，需要在 PR 描述或提交说明里写清楚原因。

## 相关文档

- [文件结构](FILE_STRUCTURE.md)
- [架构概览](ARCHITECTURE.md)
- [本地开发](LOCAL_DEVELOPMENT.md)
