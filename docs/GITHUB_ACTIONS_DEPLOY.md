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
- `CLOUDFLARE_API_TOKEN`：具有 Workers、D1、KV、R2、Queues 编辑/写入权限的 API Token。
- `INTERNAL_ADMIN_TOKEN`：后台管理系统 Admin WebUI 登录及加解密所需的密钥（请设置一个强密码）。

#### 2. 可选配置的 Variables (变量)
- `WORKER_NAME`：自定义部署的 Worker 名称（默认 `serverless-agent`）。
- `AGENT_TIMEZONE`：定时任务的时区（默认 `Asia/Shanghai`）。
- `MODEL_PROVIDER`：默认大模型提供商（默认 `mock`，可选 `openai` 或 `gemini`）。

### 第三步：触发部署工作流
1. 进入你仓库的 **Actions** 标签页。
2. **启用 Actions（关键）**：由于 GitHub 默认对 Fork 的仓库禁用 Actions，你需要先点击页面中的大绿色按钮 **"I understand my workflows, go ahead and enable them"**。
3. 在左侧列表选择 **Deploy to Cloudflare Workers** 工作流。
4. 点击右侧的 **Run workflow** 手动触发部署（首轮成功部署后，后续当你同步上游代码或推送到 `main` 分支时，也会自动触发更新部署）。
5. 工作流运行成功后，所有依赖资源（D1、KV、R2、Queue）都会自动创建并配置好，无需手动操作。

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

`CLOUDFLARE_API_TOKEN` 至少需要 Workers、D1、KV、R2、Queues 的编辑权限。

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
```

如果不提供 `D1_DATABASE_ID` 或 `KV_NAMESPACE_ID`，workflow 会按名称查找，不存在时自动创建。

`AGENT_MASTER_KEY` 用于加密 WebUI 中保存的模型供应商 API Key。没有设置时，Worker 会使用 `INTERNAL_ADMIN_TOKEN` 作为后备加密密钥。为了后续能独立轮换 WebUI 密码，生产环境建议单独设置 `AGENT_MASTER_KEY`。

## Optional Variables

可以在 GitHub repository variables 里覆盖默认名称：

```text
WORKER_NAME=serverless-agent
DEFAULT_AGENT_ID=default
MODEL_PROVIDER=mock
D1_DATABASE_NAME=serverless-agent
KV_NAMESPACE_TITLE=serverless-agent
R2_BUCKET_NAME=serverless-agent
QUEUE_NAME=serverless-agent-events
```

## What The Workflow Does

`.github/workflows/deploy-cloudflare.yml` 会：

1. 安装依赖。
2. 跑 `npm run typecheck` 和 `npm test`。
3. 构建 Admin WebUI。
4. 查找或创建 D1 database。
5. 查找或创建 KV namespace。
6. 创建 R2 bucket 和 Queue。
7. 从 `wrangler.github.toml` 生成临时 Wrangler 配置。
8. 执行远程 D1 migrations。
9. 部署 Worker。
10. 上传 Worker secrets。
11. secrets 更新后再部署一次 Worker，使新 secret 立即对当前版本可用。

## Why Not Commit Real IDs

`wrangler.toml` 保留给本地开发，里面可以保留占位 ID。GitHub Actions 使用 `wrangler.github.toml` 模板生成临时配置，不把真实 D1/KV ID 写回仓库。

这样部署配置集中在 GitHub secrets/vars，代码仓库不会因为环境差异反复改配置。
