# Source Layout

`src` 按运行职责拆分。不要把不同功能混在同一个目录里。

```text
worker       HTTP/Queue 入口
agents       Durable Object / Agent coordinator
adapters     Telegram、QQ 等平台适配
core         平台无关 agent 内核
tools        agent 可调用工具
storage      D1/R2/KV/DO storage 封装
scheduler    未来任务、心跳、重试
skills       Skill loader、frontmatter 解析和管理服务
observability 日志、审计、metrics
shared       小型共享类型和纯函数
```
