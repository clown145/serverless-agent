# Tests

测试目录后续按下面结构组织：

```text
tests/
  unit/
  integration/
  fixtures/
```

优先覆盖：

- adapter normalize。
- VFS path normalization。
- permission policy。
- tool idempotency。
- run state transition。
- schedule due-time calculation。
- storage key builder。
