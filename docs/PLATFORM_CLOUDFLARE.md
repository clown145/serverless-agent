# Cloudflare Platform Design

本项目优先使用 Cloudflare 全家桶实现 serverless agent。

## 组件映射

| 能力 | Cloudflare 组件 | 用途 |
| --- | --- | --- |
| HTTP 入口 | Workers | Telegram、QQ 官方 Webhook、企业微信、Admin/WebUI API |
| 后台队列 | Queues | 入站消息、异步任务、重试 |
| Agent 状态 | Durable Objects / Agents | 每个 agent 的状态协调器 |
| 未来任务 | Durable Object Alarms / Cron Triggers | 定时提醒、心跳、周期任务 |
| 文件内容 | Object Storage | VFS 文件、skills、artifacts、attachments。默认 R2，可选 S3-compatible 或 D1 lite |
| 结构化数据 | D1 | runs、messages、tool calls、permissions |
| 缓存 | KV | 热配置、临时去重、catalog 缓存 |
| 入站邮件 | Email Workers / Email Routing | 邮件触发 agent |
| 出站邮件 | Email Service 或第三方 API | 受权限控制的发信工具 |

## Worker

Worker 作为入口层，负责：

- 路由请求。
- 校验平台签名或 webhook secret。
- 标准化事件。
- 投递 Queue。
- 返回平台需要的响应。

Worker 不负责完整 agent loop。

## Queue

Queue 用于：

- 防止 webhook 超时。
- 缓冲平台突发消息。
- 失败重试。
- dead-letter 分析。

队列消息应该尽量小，只包含事件 ID 和必要索引；大 payload 存 D1 或对象存储。

## Durable Object / Agents

每个 agent、用户或会话可以映射到一个 Durable Object。

职责：

- 串行处理同一 agent 的 run。
- 保存近期状态。
- 调度 alarm。
- 管理 heartbeat。
- 调用 core state machine。

选择 key 的建议：

```text
agent:{agent_id}
conversation:{platform}:{conversation_id}
user:{platform}:{user_id}
```

第一版建议按 `agent:{agent_id}` 分片。

QQ 官方机器人 Gateway 模式和 Weixin OC 长轮询模式也会使用各自的 Gateway Durable Object。它们只负责平台会话维持和消息入队，不运行完整 agent loop。QQ 官方机器人选择 Webhook 模式时，不需要维护 QQ Gateway 长连接。

## Object Storage

对象存储是虚拟文件系统的内容层。

默认后端是 R2。部署 workflow 会尝试查找或创建 R2 bucket；如果账号没有 R2 权限或 R2 创建失败，会自动回退到 `d1_lite`，确保 Worker 仍能部署和保存小对象。

也可以通过 `OBJECT_STORAGE_BACKEND=s3` 使用 S3-compatible 存储。该模式需要配置 S3 endpoint、bucket 和访问密钥，不会创建 R2 bucket。

不要直接把对象存储当数据库用。文件 metadata、目录索引、权限状态应该写 D1。`d1_lite` 只是无 R2/S3 时的最低可用后备，单对象上限 256KB。

## D1

D1 是结构化状态库。

优先保存：

- agent 配置。
- 平台账号。
- 消息索引。
- run 状态。
- tool 调用。
- schedule。
- audit log。
- VFS metadata。

## KV

KV 适合缓存，不适合核心一致性状态。

可以保存：

- Skill catalog cache。
- feature flag。
- platform metadata cache。
- short-lived dedupe key。

不要保存：

- run 主状态。
- 权限决策唯一来源。
- 任务队列状态。

## 免费层边界

坚持全免费时，需要接受以下限制：

- 没有真实持久文件系统。
- 不执行真正 shell 命令。
- 不运行完整 Git。
- 不跑任意代码。
- 不做重型浏览器自动化。
- 出站邮件、通用搜索、LLM 可能需要第三方免费额度或付费 API。

第一版应把这些能力做成可插拔工具，不能让核心架构依赖它们。

## 本地开发方向

后续加入代码后，建议使用：

```bash
npm create cloudflare@latest
npm run dev
wrangler d1 migrations apply
wrangler deploy
```

实际命令以未来项目脚手架为准。
