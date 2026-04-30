# File Structure

这个仓库按“职责边界”组织文件。平台适配、agent 内核、工具、存储、调度、安全和文档不能混放。

## 顶层结构

```text
serverless-agent/
  README.md
  docs/
  specs/
  infra/
  scripts/
  src/
  tests/
```

## 详细结构

```text
serverless-agent/
  docs/
    ARCHITECTURE.md
    LOCAL_DEVELOPMENT.md
    architecture/
      RUNTIME_FLOW.md
      STORAGE_MODEL.md
      TOOLS_AND_BOUNDARIES.md
      FAILURE_AND_CONCURRENCY.md
    FILE_STRUCTURE.md
    DEVELOPMENT_GUIDE.md
    SECURITY_AND_PERMISSIONS.md
    PLATFORM_CLOUDFLARE.md
    MODEL_PROVIDERS.md
    SKILL_RUNTIME.md
    SCHEDULER_RUNTIME.md
    PERMISSIONS_RUNTIME.md
    ROADMAP.md

  specs/
    internal-message.md
    tool-contract.md
    vfs.md
    skill-manifest.md

  infra/
    cloudflare/

  scripts/

  src/
    worker/
    agents/
    adapters/
      telegram/
      qq/
    core/
    tools/
      vfs/
      search/
      messaging/
      email/
      git/
    storage/
    permissions/
    scheduler/
    skills/
    observability/
    shared/

  tests/
```

## 目录职责

### `docs/`

设计文档、开发规范、路线图。只放人读的说明，不放运行时代码。

### `specs/`

内部协议草案。包括消息格式、工具调用格式、VFS 规则、skill manifest。这里的文档应该足够精确，后续可以直接转成 TypeScript 类型。

### `infra/cloudflare/`

Cloudflare 部署配置、D1 migration、Queue/DO/R2 绑定说明。后续可以放：

```text
infra/cloudflare/wrangler.toml
infra/cloudflare/migrations/
infra/cloudflare/README.md
```

### `scripts/`

开发辅助脚本，例如同步 schema、生成类型、导入测试数据。不要把业务逻辑放进这里。

### `src/worker/`

HTTP 入口和 Queue consumer。

可以放：

- 路由定义。
- webhook 入口。
- health check。
- admin API。
- Queue consumer handler。

不放：

- agent 推理逻辑。
- 平台业务决策。
- 工具实现。

### `src/agents/`

Durable Object 或 Cloudflare Agent 实例实现。

可以放：

- Agent coordinator。
- Per-agent state。
- Alarm 处理。
- 心跳协调。
- run 锁。

不放：

- Telegram/QQ payload 细节。
- R2 key 拼接。
- 具体工具 HTTP API 细节。

### `src/adapters/`

平台适配层。每个平台一个子目录。

```text
src/adapters/telegram/
src/adapters/qq/
```

adapter 只做平台协议和内部协议转换。

### `src/core/`

agent 内核。这里是平台无关的核心逻辑。

可以放：

- run state machine。
- model provider abstraction。
- prompt/context builder。
- skill selector。
- tool call dispatcher interface。

不放：

- Cloudflare binding。
- 平台 token。
- D1/R2 细节。

### `src/tools/`

agent 可调用工具。每个工具域一个子目录。

```text
src/tools/vfs/
src/tools/search/
src/tools/messaging/
src/tools/email/
src/tools/git/
```

每个工具必须声明：

- name。
- input schema。
- output schema。
- required permissions。
- idempotency behavior。
- audit behavior。

### `src/storage/`

持久化访问层。

可以放：

- D1 repositories。
- R2 object store。
- KV cache。
- DO storage helpers。
- key/path builders。

业务模块不能直接散落 SQL 或 R2 key 拼接。

### `src/permissions/`

权限策略解析和 pending action 创建逻辑。

可以放：

- 默认权限策略。
- D1 策略合并和检查。
- 高风险工具确认请求创建。

不放：

- HTTP admin route。
- 具体工具实现。
- 平台 adapter。

### `src/scheduler/`

未来任务和心跳。

可以放：

- schedule parser。
- alarm planner。
- heartbeat checker。
- retry policy。
- dead-letter handling。

### `src/skills/`

skill 加载器和 manifest 解析器。这里不放用户安装的 skill 内容；真实 skill 内容存 R2 VFS。

### `src/observability/`

日志、审计、运行追踪、metrics。不要在业务代码里直接散落日志格式。

### `src/shared/`

跨模块共享类型和小工具函数。这里必须保持克制，不能变成杂物目录。

允许：

- 类型定义。
- 常量。
- 错误类型。
- 小型纯函数。

不允许：

- 业务流程。
- 平台 adapter。
- 工具实现。
- storage 实现。

## 放文件的判断规则

- 处理外部平台 payload：放 `src/adapters/{platform}`。
- 处理 HTTP 路由：放 `src/worker`。
- 处理 agent run 状态：放 `src/core`。
- 处理 Durable Object 生命周期：放 `src/agents`。
- 处理 R2/D1/KV：放 `src/storage`。
- 处理权限策略、确认请求：放 `src/permissions`。
- 处理可被 agent 调用的能力：放 `src/tools/{domain}`。
- 处理未来任务和心跳：放 `src/scheduler`。
- 处理 skill manifest 和加载：放 `src/skills`。
- 处理日志审计：放 `src/observability`。

如果一个文件同时想放进两个目录，通常说明它需要拆分。
