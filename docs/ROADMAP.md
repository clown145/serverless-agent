# Roadmap

下面是 `serverless-agent` 平台的开发阶段图，展示了已完成的核心能力和后续演进路线。

## Phase 0: 架构和规范 🟢 [已完成]

- `[x]` 建立仓库。
- `[x]` 固定目录结构。
- `[x]` 划分模块边界。
- `[x]` 定义内部消息、VFS、tool、skill manifest 规范草案。
- `[x]` 明确 Cloudflare 平台映射。

## Phase 1: 最小可运行内核 🟢 [已完成]

- `[x]` Worker HTTP 入口与路由分发。
- `[x]` Queue consumer 异步任务处理。
- `[x]` Agent Durable Object 实例管理与消息串行化。
- `[x]` D1 关系型数据库 schema 迁移与存储。
- `[x]` 对象存储虚拟文件系统 (VFS) 物理层实现。
- `[x]` 基础 audit log 审计。
- `[x]` Telegram Webhook 收发与格式化退回。

## Phase 2: Skills 和工具系统 🟢 [已完成]

- `[x]` skill manifest 解析。
- `[x]` skill loader 运行时选择与加载。
- `[x]` tool registry 动态工具注册表。
- `[x]` VFS 工具（ls, cat, write, rm 等）。
- `[x]` messaging 平台消息下行发送工具。
- `[x]` scheduler 定时器操作工具。
- `[x]` permission engine 细粒度工具调用授权策略。

## Phase 3: 未来任务和心跳 🟢 [已完成]

- `[x]` Durable Object alarms 周期心跳。
- `[x]` Cron sweeper 定期清理与到期调度。
- `[x]` schedules 与 heartbeats 核心表管理。
- `[x]` 失败重试逻辑 (retry policy)。

## Phase 4: 多平台接入 🟢 [已完成]

- `[x]` Telegram 适配器。
- `[x]` QQ 官方机器人长连接网关 (QQ Official Gateway DO)。
- `[x]` QQ 官方机器人 Webhook 模式。
- `[x]` 个人微信 / Weixin OC 网关及扫码登录流程。
- `[x]` 企业微信 Webhook 收发适配。
- `[x]` 多平台 identity 绑定与解析映射。
- `[x]` 平台消息限流与安全沙箱。

## Phase 5: 扩展工具 🟡 [部分完成]

- `[x]` 外部搜索提供商 (Tavily & Exa API) 对接。
- `[ ]` GitHub / GitLab API sync 工具（含 Repo 读取、Commit、PR）。
- `[ ]` 入站邮件接收与解析工具。
- `[ ]` 出站邮件发送工具。
- `[ ]` RSS/URL 网页变动监控。

## Phase 6: 管理面板 (Admin WebUI) 🟢 [已完成]

- `[x]` 模型设置与 Agent 绑定配置。
- `[x]` 运行日志 (Runs) 与步序记录 (Steps) 查看。
- `[x]` 调试沙盒控制台 (Chat/Debug Console)。
- `[x]` 在线虚拟文件系统 (VFS) 浏览器。
- `[x]` 定时任务 (Schedules) 在线添加、查看与管理。
- `[x]` Pending Actions 手动审批与拒绝。
- `[x]` 权限策略 (Permission Policies) 编辑与查看。

## Phase 7: 高级能力 🔴 [规划中]

- `[ ]` 多 Agent 协同与工作流编排。
- `[ ]` 长期计划系统 (Long-term planning & self-reflection)。
- `[ ]` 自动化代码修改、Skill 自我更新升级。
- `[ ]` Cloudflare Vectorize 向量检索引擎接入。
- `[ ]` 外部安全容器/执行沙箱 (Container runner) 接入。

## 暂不做/安全边界 🚫

- `[x]` 不执行物理主机的 `git pull` 与本地 merge。
- `[x]` 不直接运行本地 shell 命令。
- `[x]` 不提供无限制的外部网页浏览器自动化控制。
- `[x]` 严禁 LLM 在未经 Pending Action 确认的情况下，向外部群组外发群发无限制的广播消息。
