# 架构概览

## 背景

`serverless-agent` 把 agent 设计成可恢复的 serverless 状态机，而不是依赖常驻进程、本地磁盘状态或进程内队列。

运行时基于 Cloudflare Workers、Queues、Durable Objects、D1、KV 和对象存储。

## 职责

架构拆分为几个明确的运行边界：

- 接收平台和 admin 输入；
- 将输入规范化为内部消息；
- 通过 Cloudflare Queues 缓冲任务；
- 通过 Durable Objects 串行处理同一 agent 的任务；
- 执行平台无关的 agent loop；
- 通过权限和审计边界处理工具调用；
- 将结构化状态保存到 D1，将较大内容保存到对象存储。

## 非职责

核心运行时不负责：

- 执行任意 shell 命令；
- 依赖真实可写文件系统；
- 让模型直接接触平台 token 或供应商密钥；
- 只把业务状态保存在内存里；
- 在 `src/core` 中处理平台协议细节。

## 运行拓扑

```text
Telegram / QQ / WeCom / Weixin OC / WebUI / Admin
        |
        v
Cloudflare Worker
  - HTTP routes
  - webhook verification
  - event normalization
  - queue dispatch
        |
        v
Cloudflare Queue
        |
        v
Agent Durable Object
  - per-agent mailbox
  - serial event processing
  - alarms and recovery
        |
        v
Agent Core
  - context assembly
  - model provider dispatch
  - tool-call loop
        |
        v
Tools / Storage / Scheduler
  - permission checks
  - VFS
  - platform outbound
  - D1 / KV / object storage
```

## 模块边界

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| Worker | `src/worker` | HTTP 路由、webhook 校验、admin API、Queue 和 Cron 入口。 |
| Adapters | `src/adapters` | 平台 payload 解析、规范化和出站协议调用。 |
| Agents | `src/agents` | Durable Object 协调、mailbox 状态、alarm 和恢复。 |
| Core | `src/core` | 平台无关的 agent loop、上下文构造、模型调度和工具调用流程。 |
| Tools | `src/tools` | 模型可调用工具、schema、权限和副作用执行。 |
| Storage | `src/storage` | D1 repository、对象存储抽象和持久化边界。 |
| Scheduler | `src/scheduler` | 未来任务、周期任务、Cron 扫描和 heartbeat。 |
| Permissions | `src/permissions` | 权限策略解析和 pending action 执行。 |

## 失败模式

运行时假设平台请求、Queue 投递、模型调用和工具调用都可能独立失败。

主要恢复机制：

- Queue retry 缓冲临时入口失败。
- Durable Object mailbox 按 agent 串行化事件。
- mailbox event state 提供有限幂等窗口，并在保留期后清理。
- runs 和 run steps 持久化到 D1，便于检查和恢复。
- 高风险工具调用可以在发生副作用前停在 pending confirmation。

## 相关文档

- [运行流程](architecture/RUNTIME_FLOW.md)
- [存储模型](architecture/STORAGE_MODEL.md)
- [工具与边界](architecture/TOOLS_AND_BOUNDARIES.md)
- [失败与并发](architecture/FAILURE_AND_CONCURRENCY.md)
- [平台接入](architecture/PLATFORM_INTEGRATIONS.md)
