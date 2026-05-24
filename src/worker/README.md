# Worker

## 概览

`worker` 是 HTTP、Queue、Cron 和 assets 入口层。

## 职责

- 路由 HTTP 请求。
- 校验 webhook 和 admin token。
- 标准化入口请求并入队。
- 处理 Queue consumer。
- 处理 scheduled handler。
- 提供 health check。
- 提供 admin API。
- 提供 WebUI assets。

## 边界

Worker 不负责 agent 决策、模型调用、工具执行细节或存储实现细节。

## 相关文档

- [../../docs/LOCAL_DEVELOPMENT.md](../../docs/LOCAL_DEVELOPMENT.md)
- [../../docs/GITHUB_ACTIONS_DEPLOY.md](../../docs/GITHUB_ACTIONS_DEPLOY.md)
