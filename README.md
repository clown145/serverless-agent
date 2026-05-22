# serverless-agent

`serverless-agent` 是一个 Cloudflare-native 的 serverless agent 设计仓库。目标不是做一个普通聊天机器人，而是做一个可以接入多平台、拥有虚拟工作区、可调度未来任务、可审计执行工具的 agent 内核。

## 目标

- 运行在 Cloudflare Workers / Queues / Durable Objects / R2 / D1 上。
- 已支持 Telegram、QQ 官方机器人、微信公众号/个人微信、企业微信、Web UI 等多平台入口。
- 使用 R2 + D1 实现虚拟文件系统 (VFS)，存放 skills、workspace、artifacts、memory。
- 用 Durable Object 维护每个 agent 的长期状态和串行执行（保证同一会话请求串行化）。
- 用工具权限系统控制“高特权”操作，例如发送平台消息、读写文件系统等，支持 Pending 确认逻辑。
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
- [docs/PERMISSIONS_RUNTIME.md](docs/PERMISSIONS_RUNTIME.md): 显式权限策略、默认权限和 pending action 确认流程。
- [docs/ADMIN_WEBUI.md](docs/ADMIN_WEBUI.md): React/Vite 管理控制台和 `platform:webui` 入口。
- [docs/GITHUB_ACTIONS_DEPLOY.md](docs/GITHUB_ACTIONS_DEPLOY.md): 不绑定 Cloudflare 仓库的 GitHub Actions 部署方式。
- [docs/ROADMAP.md](docs/ROADMAP.md): MVP 到长期版本路线。
- [docs/architecture/PLATFORM_INTEGRATIONS.md](docs/architecture/PLATFORM_INTEGRATIONS.md): 各社交平台网关长连接与拉取消息的具体实现原理。
- [specs/](specs): 内部消息、工具、VFS、skill manifest 的接口草案。

## 当前实现与功能状态

目前仓库已经超越了最初的 MVP 阶段，核心内核以及大部分周边平台生态均已实现，并且有完备的单元测试覆盖。

### 1. 已实现的核心功能 ✅
- **多平台收发与网关适配**：
  - **Telegram Webhook**：完备的收发消息及富文本格式化回退（HTML/Markdown 转纯文本）容错机制。
  - **QQ 官方机器人 (QQ Official)**：利用 Durable Object 进行网关长连接维护和会话维持。
  - **微信公众号 / 个人微信 (Weixin OC)**：基于腾讯 `iLink` 接口实现扫码登录、状态轮询与长连接保持。*(注：未经真实环境测试，仅通过 Mock 单元测试验证)*
  - **企业微信 (Wecom)**：支持 Webhook 接收。
- **Agent 运行循环与上下文**：基于 LLM 决策、具备可选技能（Skills）过滤与运行时工具注册机制的 `agent-tool-loop`。
- **R2-backed 虚拟文件系统 (VFS)**：提供 Agent 读写文件、管理工作区和归档的虚拟目录机制。
- **定时与未来任务 (Scheduler)**：基于 Durable Object Alarms 和 Cron Triggers 的心跳、未来任务调度、失败重试等。
- **权限与确认机制 (Permissions & Pending Actions)**：提供精细化策略控制，支持针对“发消息、调用高特权 API”等敏感操作的 Pending 确认流程。
- **功能齐备的后台管理端 (Admin WebUI)**：React + Vite 构建的仪表盘，支持多语言 (i18n)、模型配置、三方平台对接、调试沙盒、Runs 运行日志查看、在线文件系统操作以及审批 Pending Actions。
- **搜索服务对接 (Search Providers)**：集成了 **Tavily** 与 **Exa** 外部搜索提供商。

### 2. 计划与建设中的能力 🚧
- **Git 工具**：设计已归档，后续计划通过 GitHub/GitLab API 逐步接入完整的代码仓读取、Skills 同步、Commit 与 PR 创建工具。
- **邮件服务对接**：入站邮件接收解析与出站邮件发送工具。
- **RSS/URL 监控监控器**。
