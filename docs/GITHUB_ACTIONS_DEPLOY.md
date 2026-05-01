# GitHub Actions Deploy

这个项目推荐用 GitHub Actions 部署到 Cloudflare Workers，不需要在 Cloudflare Dashboard 里绑定仓库。

部署流程参考了 `cloud-mail` 的做法：Actions 读取 GitHub secrets/vars，自动解析或创建 Cloudflare 资源，把 D1/KV 等 ID 写进临时 Wrangler 配置，然后执行 migration 和 deploy。

参考：

- https://github.com/maillab/cloud-mail/blob/main/.github%2Fworkflows%2Fdeploy-cloudflare.yml

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
OPENAI_API_KEY
GEMINI_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
D1_DATABASE_ID
KV_NAMESPACE_ID
```

如果不提供 `D1_DATABASE_ID` 或 `KV_NAMESPACE_ID`，workflow 会按名称查找，不存在时自动创建。

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

## Why Not Commit Real IDs

`wrangler.toml` 保留给本地开发，里面可以保留占位 ID。GitHub Actions 使用 `wrangler.github.toml` 模板生成临时配置，不把真实 D1/KV ID 写回仓库。

这样部署配置集中在 GitHub secrets/vars，代码仓库不会因为环境差异反复改配置。
