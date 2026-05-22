# Architecture

`serverless-agent` 的核心原则是：agent 是可恢复的状态机，不是长时间常驻进程。

这份文件只保留总览。细节拆到 `docs/architecture/`，避免一个架构文档混进所有主题。

## 文档拆分

- [architecture/RUNTIME_FLOW.md](architecture/RUNTIME_FLOW.md): 请求、队列、Durable Object 和 agent run 流程。
- [architecture/STORAGE_MODEL.md](architecture/STORAGE_MODEL.md): D1、R2、KV、DO storage 的职责。
- [architecture/TOOLS_AND_BOUNDARIES.md](architecture/TOOLS_AND_BOUNDARIES.md): 工具系统、VFS、Git、邮件、搜索边界。
- [architecture/FAILURE_AND_CONCURRENCY.md](architecture/FAILURE_AND_CONCURRENCY.md): 失败恢复、重试、幂等和并发模型。
- [architecture/PLATFORM_INTEGRATIONS.md](architecture/PLATFORM_INTEGRATIONS.md): Telegram、微信、企业微信及 QQ 官方机器人的网关集成与会话维持原理。

## 总体拓扑

```text
Telegram / QQ / Webhook / Admin UI
        |
        v
Cloudflare Worker
  - HTTP routes
  - webhook verification
  - event normalization
  - enqueue jobs
        |
        v
Cloudflare Queues
        |
        v
Durable Object / Cloudflare Agent
  - per-agent coordinator
  - serial state updates
  - alarms and heartbeat
        |
        v
Agent Core
  - run state machine
  - context assembly
  - skill selection
  - tool-call dispatch contract
        |
        v
Tools / Storage / Scheduler
  - VFS
  - messaging
  - search
  - email
  - git sync
  - D1 / R2 / KV
```

## 模块职责

### Worker

位置：`src/worker`

职责：

- 暴露 HTTP API。
- 接收 Telegram、QQ、Webhook。
- 做认证和签名校验。
- 转换 payload 为内部消息。
- 写入 Queue。
- 暴露健康检查和管理 API。

Worker 不直接跑完整 agent，不直接执行危险工具，也不保存业务状态到内存。

### Adapters

位置：`src/adapters`

职责：

- 平台 payload 解析。
- 平台用户、群、消息 ID 规范化。
- 平台响应格式封装。
- 平台错误码转为内部错误。

adapter 只负责平台协议和内部协议互转，不做 agent 决策。

### Agents

位置：`src/agents`

职责：

- Durable Object 或 Cloudflare Agent 实例。
- 管理 agent state。
- 串行化同一 agent 的任务。
- 处理 alarms、心跳、未来任务。
- 调用 core 层执行下一步。

### Core

位置：`src/core`

职责：

- agent run 状态机。
- 上下文组装。
- skill 选择。
- 模型请求构造。
- tool call 协议。
- run 恢复逻辑。

Core 不依赖 Telegram/QQ、Cloudflare binding 或 D1/R2 细节。

### Tools

位置：`src/tools`

职责：

- 提供 agent 可调用能力。
- 声明 schema、权限、幂等规则。
- 执行外部 API 或内部操作。
- 返回结构化结果。

工具必须通过 registry 注册，不允许散落调用。

### Storage

位置：`src/storage`

职责：

- 封装 D1、R2、KV、DO storage。
- 提供 repository 接口。
- 管理事务、索引、分页、对象 key 规范。

业务层不直接拼 R2 key 或 SQL。

### Scheduler

位置：`src/scheduler`

职责：

- 未来任务。
- cron 调度。
- Durable Object alarms。
- 心跳检查。
- 失败重试和 dead-letter 处理策略。
