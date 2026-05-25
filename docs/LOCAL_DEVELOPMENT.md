# 本地开发

## 目标

在本地运行 Worker，通过 admin API 发送测试消息，并检查运行状态。

## 前置条件

- Node.js 20 或更新版本。
- npm。
- 如果需要访问 Cloudflare 资源，需要配置 Wrangler 登录状态。

本地默认模型供应商是 `mock`，第一次运行不需要模型 API key。

## 安装依赖

```bash
npm install
```

可选：复制本地环境变量模板。

```bash
cp .dev.vars.example .dev.vars
```

## 准备本地 D1

```bash
npm run db:migrate:local
```

该命令会应用 `infra/cloudflare/migrations` 下的 SQL migration。

## 启动 Worker

```bash
npm run dev
```

管理界面地址：

```text
http://localhost:8787/ui
```

如果只需要启动前端：

```bash
npm run admin:dev
```

如果只需要构建前端：

```bash
npm run admin:build
```

## 发送测试消息

开发时建议使用 sync mode。它会直接把事件发送给 Agent Durable Object，并返回 run id。

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"platform":"webui","conversationId":"webui:default","text":"/ping","mode":"sync"}'
```

预期响应结构：

```json
{
  "ok": true,
  "eventId": "evt_...",
  "result": {
    "handled": true,
    "runId": "run_..."
  }
}
```

如果本地 shell 设置了代理变量，导致本地请求卡住，可以加：

```bash
NO_PROXY=127.0.0.1,localhost curl --noproxy '*' ...
```

## 验证运行状态

查看某次 run：

```bash
curl -sS http://localhost:8787/admin/runs/run_...
```

列出最近的 runs：

```bash
curl -sS http://localhost:8787/admin/runs
```

检查健康状态：

```bash
curl -sS http://localhost:8787/health
```

## 常见本地操作

写入 VFS 文件：

```bash
curl -sS -X PUT http://localhost:8787/admin/vfs \
  -H 'content-type: application/json' \
  -d '{"path":"/workspace/notes/hello.md","content":"hello"}'
```

读取 VFS 文件：

```bash
curl -sS 'http://localhost:8787/admin/vfs?mode=file&path=/workspace/notes/hello.md'
```

创建立即执行的一次性 schedule：

```bash
curl -sS http://localhost:8787/admin/schedules \
  -H 'content-type: application/json' \
  -d '{"text":"/write /workspace/notes/scheduled.md from-schedule","delaySeconds":0}'
```

触发本地 scheduled handler：

```bash
curl -sS http://localhost:8787/cdn-cgi/handler/scheduled
```

列出权限策略：

```bash
curl -sS http://localhost:8787/admin/permission-policies
```

列出等待确认的 actions：

```bash
curl -sS http://localhost:8787/admin/pending-actions
```

## Queue Mode

接近生产的模式会使用 Queue binding：

```bash
curl -sS http://localhost:8787/admin/messages \
  -H 'content-type: application/json' \
  -d '{"text":"hello","mode":"queue"}'
```

如果省略 `mode`，API 默认使用 queue mode。

## 验证

提交 pull request 前运行：

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
```

如果改动影响部署流程，额外运行：

```bash
npm run dry-run
```

## Admin Token

如果配置了 `INTERNAL_ADMIN_TOKEN`，admin 路由需要：

```text
Authorization: Bearer <token>
```

## 相关文档

- [GitHub Actions 部署](GITHUB_ACTIONS_DEPLOY.md)
- [Admin WebUI](ADMIN_WEBUI.md)
- [模型供应商](MODEL_PROVIDERS.md)
