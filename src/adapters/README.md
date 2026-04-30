# Adapters

平台适配层。

每个平台一个子目录，例如：

```text
telegram/
qq/
```

adapter 只负责平台协议和内部协议互转，不做 agent 决策。
