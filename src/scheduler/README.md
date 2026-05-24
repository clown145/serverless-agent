# Scheduler

## 概览

`scheduler` 负责未来任务、周期任务、heartbeat 和 retry 相关逻辑。

## 职责

- 创建和更新 schedules。
- 计算 next run time。
- Cron sweep 到期任务。
- 投递 `schedule.fire` queue event。
- 写入 heartbeat。
- 提供 retry policy 和 dead-letter 相关逻辑。

## 边界

Scheduler 不解析平台 payload，不绕过权限系统。由 schedule 触发的任务仍进入正常 Agent Durable Object 和 agent runtime。

## 相关文档

- [../../docs/SCHEDULER_RUNTIME.md](../../docs/SCHEDULER_RUNTIME.md)
- [../../docs/architecture/RUNTIME_FLOW.md](../../docs/architecture/RUNTIME_FLOW.md)
