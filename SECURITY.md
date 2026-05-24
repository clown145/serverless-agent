# 安全政策

## 支持版本

这个仓库目前处于早期阶段，安全修复跟随 `main` 分支。

## 报告漏洞

如果发现安全漏洞，请不要在公开 issue 中发布可利用细节。

如果仓库启用了 GitHub private vulnerability reporting，请优先使用它。否则请先通过 GitHub 联系维护者，只提供建立私密沟通渠道所需的最少信息。

## 关注范围

安全敏感区域包括：

- 平台 webhook 校验；
- admin 鉴权和 `INTERNAL_ADMIN_TOKEN` 处理；
- 已保存的模型供应商凭据；
- 权限策略判断；
- pending action 确认流程；
- 出站消息工具；
- VFS 和对象存储访问；
- Durable Object mailbox 恢复和幂等。

## 运行建议

- 不要提交 `.dev.vars`、平台 token 或模型 API key。
- 生产环境使用 Wrangler secrets 或 GitHub Actions secrets。
- 非本地部署应设置 `INTERNAL_ADMIN_TOKEN`。
- 建议单独设置 `AGENT_MASTER_KEY`，用于加密保存的模型供应商凭据。

安全设计细节见 [docs/SECURITY_AND_PERMISSIONS.md](docs/SECURITY_AND_PERMISSIONS.md)。
