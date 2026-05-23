# GitHub Actions Deploy

这个项目推荐用 GitHub Actions 部署到 Cloudflare Workers，不需要在 Cloudflare Dashboard 里绑定仓库。

## 极速开始 (Fork & Deploy)

只要 Fork 本仓库并配置好 GitHub 环境变量，即可实现一键自动部署：

### 第一步：Fork 仓库
1. 点击 GitHub 页面右上角的 **Fork** 按钮，将本仓库 Fork 到你自己的账号下。

### 第二步：配置 GitHub Secrets & Variables
在你自己仓库的 **Settings -> Secrets and variables -> Actions** 页面配置以下项：

#### 1. 必须配置的 Secrets (密文)
- `CLOUDFLARE_ACCOUNT_ID`：你的 Cloudflare 账户 ID。
- `CLOUDFLARE_API_TOKEN`：具有 Workers、D1、KV、Queues 编辑/写入权限的 API Token。默认使用 R2 时还需要 R2 权限；如果账号未开通 R2，workflow 会自动回退到 `d1_lite`。
- `INTERNAL_ADMIN_TOKEN`：后台管理系统 Admin WebUI 登录及加解密所需的密钥（请设置一个强密码）。

#### 2. 可选配置的 Variables (变量)
- `WORKER_NAME`：自定义部署的 Worker 名称（默认 `serverless-agent`）。
- `AGENT_TIMEZONE`：定时任务的时区（默认 `Asia/Shanghai`）。
- `MODEL_PROVIDER`：默认大模型提供商（默认 `mock`，可选 `openai` 或 `gemini`）。
- `OBJECT_STORAGE_BACKEND`：对象存储后端（默认 `r2`，可选 `r2`、`s3`、`d1_lite`）。

### 第三步：触发部署工作流
1. 进入你仓库的 **Actions** 标签页。
2. **启用 Actions（关键）**：由于 GitHub 默认对 Fork 的仓库禁用 Actions，你需要先点击页面中的大绿色按钮 **"I understand my workflows, go ahead and enable them"**。
3. 在左侧列表选择 **Deploy to Cloudflare Workers** 工作流。
4. 点击右侧的 **Run workflow** 手动触发部署（首轮成功部署后，后续当你同步上游代码或推送到 `main` 分支时，也会自动触发更新部署）。
5. 工作流运行成功后，依赖资源（D1、KV、Queue，以及按对象存储后端需要的 R2）都会自动创建并配置好。默认会优先使用 R2；如果 R2 不可用，会自动回退到 `d1_lite`。

### 第四步：访问后台管理端
部署成功后，访问以下地址进入管理控制台：
```text
https://<你的Worker子域名>.workers.dev/ui
```
输入你配置的 `INTERNAL_ADMIN_TOKEN` 即可登录并开始配置你的 AI Agent。

---

## Required Secrets

在 GitHub 仓库设置里添加：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
INTERNAL_ADMIN_TOKEN
```

`CLOUDFLARE_API_TOKEN` 至少需要 Workers、D1、KV、Queues 的编辑权限。默认对象存储后端是 `r2`，因此常规部署还需要 R2 编辑权限；如果选择 `s3` 或 `d1_lite`，R2 权限不是必需项。

`INTERNAL_ADMIN_TOKEN` 是部署后的 admin API 和 WebUI token。

## Optional Secrets

按需添加：

```text
AGENT_MASTER_KEY
OPENAI_API_KEY
GEMINI_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
D1_DATABASE_ID
KV_NAMESPACE_ID
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

如果不提供 `D1_DATABASE_ID` 或 `KV_NAMESPACE_ID`，workflow 会按名称查找，不存在时自动创建。

`AGENT_MASTER_KEY` 用于加密 WebUI 中保存的模型供应商 API Key。没有设置时，Worker 会使用 `INTERNAL_ADMIN_TOKEN` 作为后备加密密钥。为了后续能独立轮换 WebUI 密码，生产环境建议单独设置 `AGENT_MASTER_KEY`。

`S3_ACCESS_KEY_ID` 和 `S3_SECRET_ACCESS_KEY` 仅在 `OBJECT_STORAGE_BACKEND=s3` 时需要。

## Optional Variables

可以在 GitHub repository variables 里覆盖默认名称：

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
```

### Object Storage Backend

对象存储用于 VFS 大文件、skills、artifacts 和 attachments。可通过 repository variables 里的 `OBJECT_STORAGE_BACKEND` 选择：

- `r2`：默认模式。workflow 会查找或创建 `R2_BUCKET_NAME`，并绑定为 Worker 的 `AGENT_BUCKET`。如果 R2 bucket 列表或创建失败，会自动回退到 `d1_lite`，避免没有信用卡验证或没有 R2 权限的账号部署失败。
- `s3`：使用 S3-compatible 存储。需要配置 `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`，可选 `S3_REGION` 和 `S3_FORCE_PATH_STYLE`。该模式不会创建 R2 bucket，也不会生成 R2 binding。
- `d1_lite`：用 D1 表暂存小对象。单对象上限为 256KB，适合作为无 R2/S3 时的最低可用模式；大附件、大 artifact 和较大的二进制文件会受限。

`d1_lite` 不做旧数据迁移。后续如果切回 `r2` 或 `s3`，新写入对象会进入新的后端，旧对象不会自动搬迁。

## What The Workflow Does

`.github/workflows/deploy-cloudflare.yml` 会：

1. 安装依赖。
2. 跑 `npm run typecheck` 和 `npm test`。
3. 构建 Admin WebUI。
4. 查找或创建 D1 database。
5. 查找或创建 KV namespace。
6. 按 `OBJECT_STORAGE_BACKEND` 准备对象存储：默认查找或创建 R2；R2 不可用时回退 `d1_lite`；S3 模式只校验配置。
7. 查找或创建 Queue。
8. 从 `wrangler.github.toml` 生成临时 Wrangler 配置；只有实际使用 R2 时才写入 R2 binding。
9. 执行远程 D1 migrations。
10. 部署 Worker。
11. 上传 Worker secrets。
12. secrets 更新后再部署一次 Worker，使新 secret 立即对当前版本可用。

## Why Not Commit Real IDs

`wrangler.toml` 保留给本地开发，里面可以保留占位 ID。GitHub Actions 使用 `wrangler.github.toml` 模板生成临时配置，不把真实 D1/KV ID 写回仓库。

这样部署配置集中在 GitHub secrets/vars，代码仓库不会因为环境差异反复改配置。
