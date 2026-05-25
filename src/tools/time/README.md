# Time Tools

## 概览

`time.now` 提供当前时间查询。基础 system prompt 不直接注入当前时间，模型需要处理“现在、今天、明天、多久以后、定时任务”等时间敏感请求时应调用该工具。

## 工具

- `time.now`：返回当前 UTC ISO 时间、Unix 时间戳，以及指定或默认 timezone 下的本地日期和时间。

## 权限

该工具只读、无外部副作用，不需要额外 scope。
