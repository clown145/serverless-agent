# Agents

这里放 Durable Object 或 Cloudflare Agent coordinator。

负责：

- 每个 agent 的状态协调。
- 串行化同一 agent 的任务。
- alarm 和心跳。
- run 恢复。
- 调用 core 层执行下一步。

不放平台 adapter 逻辑。
