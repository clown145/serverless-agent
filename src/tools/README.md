# Tools

agent 可调用工具都放这里。

每个工具需要：

- schema。
- executor。
- permissions。
- audit behavior。
- timeout/retry policy。
- README。

工具必须通过 registry 注册，不允许散落调用。
