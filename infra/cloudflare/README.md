# Cloudflare Infra

## 概览

`infra/cloudflare` 放 Cloudflare 相关迁移和部署说明。运行时资源由 Wrangler、本地命令或 GitHub Actions workflow 创建和绑定。

## 当前内容

```text
infra/cloudflare/
  migrations/
    0001_initial.sql
    ...
```

D1 migrations 定义 runs、messages、VFS、permissions、model settings、platform integrations、schedules 等结构化状态。

## 边界

- 不在这里保存真实 Cloudflare account id、D1 database id、KV namespace id 或 secrets。
- 本地占位配置可以放在仓库内，生产部署配置由 secrets 和 variables 注入。
- 对象存储后端可能是 R2、S3-compatible 或 D1 lite，具体由环境变量决定。

## 相关文档

- [../../docs/GITHUB_ACTIONS_DEPLOY.md](../../docs/GITHUB_ACTIONS_DEPLOY.md)
- [../../docs/PLATFORM_CLOUDFLARE.md](../../docs/PLATFORM_CLOUDFLARE.md)
