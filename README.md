# serverless-agent

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg?style=flat-square)](LICENSE)

Cloudflare-native runtime for multi-platform agents.

`serverless-agent` 是一个不需要自建服务器的 agent 后端。它运行在 Cloudflare Workers、Queues、Durable Objects、D1、KV 和对象存储之上，用来接收来自 Telegram、QQ、企业微信、Weixin OC 或 WebUI 的消息，并把这些消息交给同一套 agent runtime 处理。

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Security

- 不要把平台 token、模型 API key 或 `INTERNAL_ADMIN_TOKEN` 提交到仓库。
- 本地开发使用 `.dev.vars`；生产环境使用 Wrangler secrets 或 GitHub Actions secrets。
- 如果配置了 `INTERNAL_ADMIN_TOKEN`，所有 `/admin/*` 路由都需要 `Authorization: Bearer <token>`。

更多安全和权限设计见 [SECURITY.md](SECURITY.md) 和 [docs/SECURITY_AND_PERMISSIONS.md](docs/SECURITY_AND_PERMISSIONS.md)。

## Background

很多 agent 项目默认需要一台一直在线的服务器，用进程内队列、磁盘文件和后台 worker 维持状态。`serverless-agent` 选择了另一种方式：把 agent 设计成可恢复的 serverless 状态机，而不是常驻进程。

核心特点：

- **不需要自建服务器**：部署目标是 Cloudflare，不需要维护 VPS、systemd、Docker daemon 或常驻后台进程。
- **多入口同一运行时**：Telegram、QQ、WeCom、Weixin OC 和 WebUI 消息会被规范化为内部消息，然后进入同一条 agent pipeline。
- **按 agent 串行处理**：Durable Object 负责同一 agent 的 mailbox、幂等、重试和恢复，避免同一会话中的任务并发写状态。
- **有边界的工具执行**：模型不会直接持有平台 token 或密钥；发消息、写工作区、外部操作等能力通过工具注册和权限策略控制。
- **虚拟工作区和定时任务**：使用 D1 与对象存储保存 workspace、skills、artifacts 和 schedules，适合无真实文件系统的 runtime。

基本流程：

```text
Platform Webhook / Admin UI
        |
Cloudflare Worker
        |
Cloudflare Queue
        |
Agent Durable Object
        |
Agent Core / Tools / Storage
```

主要模块：

- `src/worker`: HTTP、Queue、Cron 入口。
- `src/agents`: Durable Object 协调与 mailbox 串行处理。
- `src/core`: 平台无关的 agent loop、上下文和模型调用。
- `src/adapters`: Telegram、QQ、WeCom、Weixin OC 等平台适配。
- `src/storage`: D1、对象存储和 repository 层。
- `apps/admin-web`: 管理控制台。

文档入口见 [docs/README.md](docs/README.md)，更完整的设计说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## Install

依赖：

- Node.js 20+
- npm
- Cloudflare Wrangler

安装依赖：

```bash
npm install
```

可选：复制本地环境变量模板。

```bash
cp .dev.vars.example .dev.vars
```

应用本地 D1 migrations：

```bash
npm run db:migrate:local
```

## Usage

启动本地 Worker：

```bash
npm run dev
```

打开管理界面：

```text
http://localhost:8787/ui
```

发送一条本地同步消息：

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"platform":"webui","conversationId":"webui:default","text":"/ping","mode":"sync"}'
```

常用命令：

```bash
npm run prompts:build
npm run lint
npm run format:check
npm run typecheck
npm test
npm run admin:build
npm run dry-run
```

部署建议使用 GitHub Actions，见 [docs/GITHUB_ACTIONS_DEPLOY.md](docs/GITHUB_ACTIONS_DEPLOY.md)。

默认提示词集中在 `src/prompts/defaults`。Fork 定制时建议在 `src/prompts/overrides` 下创建同名 Markdown 文件，构建时会覆盖默认提示词，避免直接修改上游默认文件造成更新冲突。

## API

常用 HTTP 入口：

- `GET /health`
- `GET /ui`
- `POST /admin/messages`
- `GET /admin/runs`
- `GET /admin/vfs`
- `POST /webhooks/telegram`
- `POST /webhooks/wecom/:webhookSecret`
- `POST /webhooks/qq-official/:webhookSecret`

本地开发和管理接口示例见 [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)。

## Maintainers

- [@clown145](https://github.com/clown145)

## Contributing

Issues 和 pull requests 可以直接在 GitHub 提交。

提交前请运行：

```bash
npm run typecheck
npm test
```

开发约定见 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)。

## License

GPL-3.0-or-later © serverless-agent contributors. See [LICENSE](LICENSE).
