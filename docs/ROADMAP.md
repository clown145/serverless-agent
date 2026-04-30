# Roadmap

## Phase 0: 架构和规范

- 建立仓库。
- 固定目录结构。
- 写清楚模块边界。
- 定义内部消息、VFS、tool、skill manifest 草案。
- 明确 Cloudflare 平台映射。

## Phase 1: 最小可运行内核

- Worker HTTP 入口。
- Queue consumer。
- Agent Durable Object。
- D1 schema。
- R2 VFS。
- 基础 audit log。
- Telegram webhook。
- 基础消息回复。

## Phase 2: Skills 和工具系统

- skill manifest 解析。
- skill loader。
- tool registry。
- VFS 工具。
- messaging 工具。
- scheduler 工具。
- permission engine。

## Phase 3: 未来任务和心跳

- Durable Object alarms。
- Cron sweep。
- schedule 表。
- heartbeat 表。
- retry policy。
- dead-letter 处理。

## Phase 4: 多平台接入

- QQ adapter。
- 平台账号绑定。
- 多平台 identity 映射。
- 群聊权限策略。
- 平台限流。

## Phase 5: 扩展工具

- GitHub API sync。
- 入站邮件处理。
- 出站邮件工具。
- RSS/URL monitor。
- 本地搜索。
- 外部搜索 API。

## Phase 6: 管理面板

- Agent 配置。
- Skill 管理。
- 权限管理。
- Run 查看。
- Audit log 查看。
- 手动重试和暂停。

## Phase 7: 高级能力

- 多 agent 协作。
- 长期计划系统。
- 自动生成和更新 skills。
- Vectorize 或外部向量库。
- 容器 runner 或外部 runner 接入。

## 暂不做

- 真正 `git pull`。
- 任意 shell 执行。
- 任意代码运行。
- 浏览器自动化。
- 无限制自主外发消息。
