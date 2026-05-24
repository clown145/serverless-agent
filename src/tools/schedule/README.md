# Schedule Tools

## 概览

`schedule` 工具让模型创建、查看和管理未来任务或周期任务。工具层复用 WebUI 和 `/task` 命令使用的 scheduler runtime。

## 数据来源

- D1 `schedules` 是 source of truth。
- Cloudflare Cron sweep 到期任务。
- Queue 投递 `schedule.fire` jobs。
- Agent Durable Object 处理 schedule 触发的文本。

## 工具

- `schedule.create`：创建一次性或周期任务。
- `schedule.list`：列出当前 agent 的 schedules。
- `schedule.pause`：暂停 active schedule。
- `schedule.resume`：恢复 paused 或 failed schedule。
- `schedule.cancel`：取消 schedule。
- `schedule.run_now`：立即投递 schedule。

## 权限

- 读取需要 `schedule:read`。
- 修改需要 `schedule:write` 和 level 3。

Recurring tasks 最小间隔为 300 秒，避免在免费层意外形成高频循环。

## 相关文档

- [../../../docs/SCHEDULER_RUNTIME.md](../../../docs/SCHEDULER_RUNTIME.md)
