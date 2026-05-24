# 路线图

## 概览

这份文档记录项目当前状态和后续方向。它不是承诺清单，具体优先级以实际需求、维护成本和安全边界为准。

## 已完成的基础能力

- 仓库结构、模块边界和文档入口。
- Worker HTTP 入口、Queue consumer 和 Cron handler。
- Agent Durable Object mailbox 串行处理。
- D1 migrations 和 repository 层。
- VFS 的 D1/object-storage 存储模型。
- audit log、runs、run steps 和 tool calls。
- Telegram、QQ Official、WeCom、Weixin OC、WebUI/Admin 入口。
- model provider 设置，包含 mock、OpenAI-compatible 和 Gemini。
- tool registry、权限检查和 pending actions。
- Skills 的 VFS-backed runtime。
- schedules、heartbeats 和 Cron sweep。
- Admin WebUI 的基础管理功能。

## 正在完善的方向

- 文档结构和模块 README 标准化。
- 多平台能力差异的 adapter 抽象。
- mailbox event state 的保留期和清理策略。
- `src/shared/types` 中共享类型的收敛。
- 搜索、HTTP、messaging、scheduler、skills 等工具的运行边界说明。

## 后续方向

- GitHub / GitLab API 工具：repo tree、文件读取、commit 和 PR。
- 入站邮件解析和出站邮件工具。
- RSS 或 URL 变动监控。
- 更完整的 rate limit 和 time window 权限策略。
- 更细的 platform capability registry。
- 多 agent 协作和 workflow 编排。
- 可选向量检索后端。
- 外部执行沙箱或 container runner。

## 暂不做

- 不在 Worker 中执行真实 `git pull`、merge 或 rebase。
- 不直接运行本地 shell 命令。
- 不提供无限制的网页浏览器自动化。
- 不让模型直接接触平台 token 或 provider API key。
- 不让未经确认的高风险工具调用直接对外产生副作用。

## 相关文档

- [架构概览](ARCHITECTURE.md)
- [开发指南](DEVELOPMENT_GUIDE.md)
- [安全与权限](SECURITY_AND_PERMISSIONS.md)
