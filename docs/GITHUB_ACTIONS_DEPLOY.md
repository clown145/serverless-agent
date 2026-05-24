# GitHub Actions 部署

## 目标

通过 GitHub Actions 将 `serverless-agent` 部署到 Cloudflare Workers，同时避免把真实的 Cloudflare 资源 ID 提交到仓库。

workflow 会准备 Worker bindings、应用 D1 migrations、构建 Admin WebUI，并部署 Worker。

## 前置条件

- 包含本项目代码的 GitHub 仓库或 fork。
- Cloudflare 账号。
- 具备 Workers、D1、KV 和 Queues 权限的 Cloudflare API token。
- 如果使用默认的 `r2` 对象存储后端，还需要 R2 权限。

## 必需 Secrets

在 GitHub 中配置：

```text
Settings -> Secrets and variables -> Actions -> Secrets
```

必需项：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
INTERNAL_ADMIN_TOKEN
```

`INTERNAL_ADMIN_TOKEN` 用于保护部署后的 admin API 和 WebUI。

## 推荐 Secrets

```text
AGENT_MASTER_KEY
```

`AGENT_MASTER_KEY` 用于加密 WebUI 中保存的模型供应商 API key。如果没有设置，Worker 会回退使用 `INTERNAL_ADMIN_TOKEN`。

## 可选 Secrets

```text
OPENAI_API_KEY
GEMINI_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
D1_DATABASE_ID
KV_NAMESPACE_ID
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

如果没有提供 `D1_DATABASE_ID` 或 `KV_NAMESPACE_ID`，workflow 会按名称查找资源，不存在时会尝试创建。

## 可选 Variables

默认值不满足时，可以配置 GitHub repository variables：

```text
WORKER_NAME=serverless-agent
DEFAULT_AGENT_ID=default
MODEL_PROVIDER=mock
D1_DATABASE_NAME=serverless-agent
KV_NAMESPACE_TITLE=serverless-agent
R2_BUCKET_NAME=serverless-agent
R2_ATTACHMENT_RETENTION_DAYS=30
OBJECT_STORAGE_BACKEND=r2
S3_ENDPOINT=
S3_BUCKET=
S3_REGION=auto
S3_FORCE_PATH_STYLE=false
QUEUE_NAME=serverless-agent-events
AGENT_TIMEZONE=Asia/Shanghai
```

## 部署步骤

1. 打开 GitHub 仓库。
2. 如果这是 fork，先启用 Actions。
3. 打开 **Actions** 页面。
4. 选择 **Deploy to Cloudflare Workers**。
5. 手动运行 workflow。

部署成功后访问：

```text
https://<worker-subdomain>.workers.dev/ui
```

使用 `INTERNAL_ADMIN_TOKEN` 登录。

## 对象存储后端

`OBJECT_STORAGE_BACKEND` 决定 VFS 大内容、skills、artifacts 和 attachments 存在哪里。

| 后端 | 说明 |
| --- | --- |
| `r2` | 默认模式。workflow 会查找或创建 `R2_BUCKET_NAME`，并绑定为 `AGENT_BUCKET`。 |
| `s3` | 使用 S3-compatible 存储。需要配置 S3 endpoint、bucket 和访问密钥。 |
| `d1_lite` | 将小对象存入 D1。适合作为 R2/S3 不可用时的最低可用模式，单对象大小受限。 |

如果 R2 设置失败，workflow 可以回退到 `d1_lite`，让 Worker 仍能部署。

`d1_lite` 不会在切换回 R2 或 S3 时迁移旧对象。切换后，新写入内容会使用新的后端。

## Workflow 做了什么

1. 安装依赖。
2. 运行 `npm run typecheck`。
3. 运行 `npm test`。
4. 生成 prompt 常量。
5. 构建 Admin WebUI。
6. 查找或创建 D1、KV、Queue 和对象存储资源。
7. 从 `wrangler.github.toml` 生成临时 Wrangler 配置。
8. 应用远程 D1 migrations。
9. 部署 Worker。
10. 上传 Worker secrets。
11. 再部署一次，让当前 Worker 版本能读取最新 secrets。

## 验证

检查健康状态：

```bash
curl -sS https://<worker-subdomain>.workers.dev/health
```

打开 WebUI：

```text
https://<worker-subdomain>.workers.dev/ui
```

## 排障

### Fork 中 Actions 未启用

GitHub 通常会默认禁用 fork 的 Actions。打开 Actions 页面并启用 workflows。

### R2 设置失败

可以用 `OBJECT_STORAGE_BACKEND=d1_lite` 做最低可用部署，或者给 `CLOUDFLARE_API_TOKEN` 增加 R2 权限。

### Admin 路由返回 401

请求需要带：

```text
Authorization: Bearer <INTERNAL_ADMIN_TOKEN>
```

### 不同环境的资源 ID 不一致

不要提交真实 D1 或 KV ID。`wrangler.toml` 保留本地占位值；GitHub workflow 会根据仓库 secrets 和 variables 生成部署配置。

## 相关文档

- [本地开发](LOCAL_DEVELOPMENT.md)
- [Cloudflare 平台设计](PLATFORM_CLOUDFLARE.md)
