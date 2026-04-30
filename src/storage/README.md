# Storage

持久化访问层。

负责：

- D1 repositories。
- R2 object store。
- KV cache。
- Durable Object storage helpers。
- key/path builder。

业务代码不直接写 SQL 或拼 R2 key。
