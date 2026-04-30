# serverless-agent

`serverless-agent` 是一个 Cloudflare-native 的 serverless agent 设计仓库。目标不是做一个普通聊天机器人，而是做一个可以接入多平台、拥有虚拟工作区、可调度未来任务、可审计执行工具的 agent 内核。

## 目标

- 运行在 Cloudflare Workers / Queues / Durable Objects / R2 / D1 上。
- 支持 Telegram、QQ、Webhook 等多平台入口。
- 使用 R2 + D1 实现虚拟文件系统，用来存放 skills、workspace、artifacts、memory。
- 用 Durable Object 或 Cloudflare Agents 维护每个 agent 的长期状态和串行执行。
- 用工具权限系统控制“大权限”操作，例如发消息、发邮件、同步 GitHub、调用外部 API。
- 支持心跳、未来任务、定时任务、失败重试和审计日志。

## 非目标

- 不把 Cloudflare Worker 当 VPS 使用。
- 不依赖真实持久文件系统。
- 不在 Worker 免费层里执行任意 shell 命令、`git pull`、`npm install` 或浏览器自动化。
- 不让模型直接持有平台 token 或外部服务密钥。
- 不承诺所有第三方能力永久免费，例如 LLM、通用网页搜索、出站邮件。

## 推荐平台组成

```text
Telegram / QQ / Webhook / Admin UI
        |
Cloudflare Worker
        |
Cloudflare Queue
        |
Agent Durable Object / Cloudflare Agent
        |
Tool Registry / Permission Engine / Skill Loader
        |
D1 / R2 / KV / External APIs
```

## 目录入口

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 整体架构和运行流程。
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md): 文件结构和模块边界。
- [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md): 开发规范。
- [docs/SECURITY_AND_PERMISSIONS.md](docs/SECURITY_AND_PERMISSIONS.md): 权限、安全和审计设计。
- [docs/PLATFORM_CLOUDFLARE.md](docs/PLATFORM_CLOUDFLARE.md): Cloudflare 平台映射。
- [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md): 本地开发、D1 迁移和调试入口。
- [docs/MODEL_PROVIDERS.md](docs/MODEL_PROVIDERS.md): OpenAI-compatible、Gemini 和 mock provider 配置。
- [docs/SKILL_RUNTIME.md](docs/SKILL_RUNTIME.md): skill 选择、上下文注入和工具授权规则。
- [docs/SCHEDULER_RUNTIME.md](docs/SCHEDULER_RUNTIME.md): future tasks、recurring schedules 和 heartbeat。
- [docs/ROADMAP.md](docs/ROADMAP.md): MVP 到长期版本路线。
- [specs/](specs): 内部消息、工具、VFS、skill manifest 的接口草案。

## 第一版 MVP

第一版只做稳定内核：

1. Telegram webhook 收发消息。
2. 每个用户或会话绑定一个 agent state。
3. R2-backed 虚拟文件系统。
4. 基础 skills 加载。
5. 基础工具：读文件、写文件、列目录、发消息、创建未来任务。
6. 定时任务和心跳。
7. 简单权限系统。
8. 运行日志和错误记录。

QQ、GitHub 同步、邮件、搜索等能力作为独立工具逐步接入。
