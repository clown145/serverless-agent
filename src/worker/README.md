# Worker

HTTP 和 Queue 入口层。

负责：

- 路由。
- webhook 校验。
- 请求认证。
- payload 入队。
- health check。
- admin API。

不负责：

- agent 决策。
- 模型调用。
- 工具执行。
- 存储细节。
