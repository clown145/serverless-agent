# Scheduler Runtime

## 概览

Scheduler 允许 agent 在没有新用户消息的情况下运行未来任务或周期任务。它和 WebUI、tool、Cron、Queue、Agent Durable Object 共用同一套运行路径。

## 数据模型

Schedules 存储在 D1：

```text
schedules.id
schedules.agent_id
schedules.status
schedules.due_at
schedules.interval_seconds
schedules.payload_json
schedules.last_run_at
```

当前 payload 示例：

```json
{
  "text": "/skill reader /read /workspace/notes/a.md",
  "conversationId": "admin:schedule"
}
```

`conversationId` 可选。未指定时，运行时使用 `admin:schedule`。

## Admin API

创建一次性 schedule：

```bash
curl -sS http://localhost:8787/admin/schedules \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","delaySeconds":60}'
```

创建周期 schedule：

```bash
curl -sS http://localhost:8787/admin/schedules \
  -H 'content-type: application/json' \
  -d '{"text":"/ping","delaySeconds":60,"intervalSeconds":3600}'
```

查看 schedules：

```bash
curl -sS http://localhost:8787/admin/schedules
```

取消 schedule：

```bash
curl -sS -X DELETE http://localhost:8787/admin/schedules/sch_...
```

## Model Tools

agent 可以通过内置工具管理 schedule：

- `schedule.create`：创建一次性或周期任务。
- `schedule.list`：查看当前 agent 的 schedules。
- `schedule.pause`：暂停 schedule。
- `schedule.resume`：恢复 paused 或 failed schedule。
- `schedule.cancel`：取消 schedule。
- `schedule.run_now`：立即投递已有 schedule。

这些工具默认使用当前 actor 和 conversation。Telegram 中创建的任务通常会回到同一个 Telegram conversation。

读取需要 `schedule:read`；修改需要 `schedule:write` 和 level 3。

## Cron Sweep

Cloudflare Cron 会调用 scheduled handler。handler 会：

1. 查找 `due_at <= scheduledTime` 的 active schedules。
2. 为每个到期 schedule 投递 `schedule.fire` queue event。
3. 将一次性 schedule 标记为 `completed`。
4. 将周期 schedule 推进到下一个 `due_at`。
5. 写入 `cron` heartbeat。

Queue delivery 是异步的，所以 schedule 可能先被标记为 dispatched，实际 run 稍后才完成。

## 执行流程

`schedule.fire` 会被投递到 Agent Durable Object。运行时把它转换成内部 admin message：

```text
platform: admin
sender: scheduler
rawRef: schedule:{schedule_id}
scheduleId: {schedule_id}
```

随后由正常 agent runtime 处理。由 schedule 触发的 run 会在 `runs` 表记录 `schedule_id`。

## Execution Profile

每个新 schedule 会记录 `execution_profile_json`：

- `runAs`：默认 `creator`。
- `contextMode`：默认 `latest_conversation`。
- `modelMode`：显式选择模型时为 `fixed`，否则为 `follow_conversation`。
- `permissionMode`：默认 `creator_current`。
- `createdByActorId`、`createdByActorRole`、source platform、source conversation、source run。

当前执行仍使用 schedule 具体列：`actor_id`、`actor_role`、`conversation_id`、`model_provider_id`、`model_id`。profile 用来把这些选择显式记录下来，避免后续扩展 isolated context、model-following 或 permission snapshots 时从旧行里猜测语义。

## Heartbeats

Heartbeat source：

- `cron`：cron sweep 已运行并投递到期 schedule。
- `schedule-fire`：schedule event 到达 Agent Durable Object。
- `durable-object`：schedule tick 到达 Durable Object。

查看 heartbeats：

```bash
curl -sS http://localhost:8787/admin/heartbeats
```

## 相关文档

- [PERMISSIONS_RUNTIME.md](PERMISSIONS_RUNTIME.md)
- [architecture/RUNTIME_FLOW.md](architecture/RUNTIME_FLOW.md)
- [architecture/FAILURE_AND_CONCURRENCY.md](architecture/FAILURE_AND_CONCURRENCY.md)
