# Core

平台无关的 agent 核心。

负责：

- run state machine。
- context builder。
- skill selector。
- model abstraction。
- tool-call dispatcher interface。
- run recovery。

不能直接依赖 Telegram、QQ、R2、D1 细节。
