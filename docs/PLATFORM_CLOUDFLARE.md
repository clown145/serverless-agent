# Cloudflare 平台设计

## 概览

`serverless-agent` 优先使用 Cloudflare 组件运行，不依赖自建服务器或常驻后台进程。

## 组件映射

| 能力 | Cloudflare 组件 | 用途 |
| --- | --- | --- |
| HTTP 入口 | Workers | Telegram、QQ Official Webhook、WeCom、Admin/WebUI API。 |
| 后台队列 | Queues | 入站消息、异步任务和重试。 |
| Agent 状态协调 | Durable Objects | per-agent mailbox、串行处理、alarm 和恢复。 |
| 未来任务 | Cron Triggers / DO Alarms | schedule sweep、heartbeat 和周期任务。 |
| 文件内容 | Object Storage | VFS 文件、skills、artifacts、attachments。 |
| 结构化数据 | D1 | runs、messages、tool calls、permissions、schedules、VFS metadata。 |
| 缓存 | KV | 热配置、短期去重和 catalog cache。 |
| 入站邮件 | Email Workers / Email Routing | 邮件触发 agent。 |
| 出站邮件 | Email Service 或第三方 API | 受权限控制的发信工具。 |

## Worker

Worker 是入口层，负责：

- 路由请求；
- 校验平台签名或 webhook secret；
- 标准化事件；
- 投递 Queue；
- 返回平台要求的响应；
- 提供 admin API 和 WebUI assets。

Worker 不运行完整 agent loop。

## Queue

Queue 用于：

- 避免 webhook 超时；
- 缓冲平台突发消息；
- 处理失败重试；
- 支持 dead-letter 分析。

队列消息应尽量小，只包含事件 ID 和必要索引。大 payload 应放 D1 或对象存储。

## Durable Objects

Agent Durable Object 负责同一 agent 的状态协调：

- 串行处理 mailbox event；
- 保存短期恢复状态；
- 管理 alarm 和 heartbeat；
- 调用 core state machine。

当前建议按 agent 分片：

```text
agent:{agent_id}
```

QQ Official Gateway mode 和 Weixin OC long-poll mode 也使用各自的 Gateway Durable Object。它们只维持平台会话和入队，不运行完整 agent loop。

## Object Storage

对象存储是 VFS 的内容层。默认后端是 R2，也可以通过 `OBJECT_STORAGE_BACKEND=s3` 使用 S3-compatible 存储。

当 R2/S3 不可用时，可以使用 `d1_lite` 作为最低可用后备。`d1_lite` 将小对象写入 D1，单对象大小受限，不适合大附件或大 artifact。

不要把对象存储当数据库使用。文件 metadata、目录索引、权限状态和 run 状态应写入 D1。

## D1

D1 是结构化状态库，优先保存：

- agent 配置；
- platform integrations；
- conversations 和 messages；
- runs 和 run steps；
- tool calls；
- schedules；
- permission policies 和 pending actions；
- audit logs；
- VFS metadata。

## KV

KV 适合缓存，不适合作为核心一致性状态。当前代码主要用它做 runtime diagnostics 读写检查；以下是可接入的低风险用途：

后续可以保存：

- skill catalog cache；
- feature flags；
- platform metadata cache；
- short-lived dedupe key。

不要保存：

- run 主状态；
- 权限决策唯一来源；
- 任务队列状态。

## 免费层边界

坚持使用免费或低成本 serverless 资源时，需要接受以下边界：

- 没有真实持久文件系统；
- 不执行真实 shell；
- 不在 Worker 里运行完整 Git；
- 不跑任意代码；
- 不做重型浏览器自动化；
- 出站邮件、通用搜索、LLM 可能需要第三方额度或付费 API。

这些能力应作为可插拔工具接入，不能成为 core runtime 的隐式依赖。

## 相关文档

- [架构概览](ARCHITECTURE.md)
- [GitHub Actions 部署](GITHUB_ACTIONS_DEPLOY.md)
- [architecture/STORAGE_MODEL.md](architecture/STORAGE_MODEL.md)
