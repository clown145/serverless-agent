# 文档

这个目录按文档用途组织。阅读时优先选择最能回答当前问题的文档。

## 从这里开始

- [本地开发](LOCAL_DEVELOPMENT.md)：本地运行项目，并通过 admin API 发送测试消息。
- [GitHub Actions 部署](GITHUB_ACTIONS_DEPLOY.md)：通过 GitHub Actions 部署到 Cloudflare。
- [架构概览](ARCHITECTURE.md)：运行时总览和模块边界。

## 操作指南

- [本地开发](LOCAL_DEVELOPMENT.md)
- [GitHub Actions 部署](GITHUB_ACTIONS_DEPLOY.md)
- [Admin WebUI](ADMIN_WEBUI.md)

## 架构说明

- [架构概览](ARCHITECTURE.md)
- [运行流程](architecture/RUNTIME_FLOW.md)
- [存储模型](architecture/STORAGE_MODEL.md)
- [工具与边界](architecture/TOOLS_AND_BOUNDARIES.md)
- [失败与并发](architecture/FAILURE_AND_CONCURRENCY.md)
- [平台接入](architecture/PLATFORM_INTEGRATIONS.md)

## 运行时参考

- [模型供应商](MODEL_PROVIDERS.md)
- [权限运行时](PERMISSIONS_RUNTIME.md)
- [调度运行时](SCHEDULER_RUNTIME.md)
- [Skill 运行时](SKILL_RUNTIME.md)
- [安全与权限](SECURITY_AND_PERMISSIONS.md)
- [Cloudflare 平台设计](PLATFORM_CLOUDFLARE.md)

## 项目说明

- [开发指南](DEVELOPMENT_GUIDE.md)
- [文件结构](FILE_STRUCTURE.md)
- [路线图](ROADMAP.md)

## 新增文档的写法

建议按下面几种结构写：

- **操作指南**：目标、前置条件、步骤、验证、排障、相关链接。
- **参考文档**：概要、字段/接口/变量、示例、注意事项。
- **架构文档**：背景、职责、非职责、流程、失败模式、相关决策。

不要把长期设计决策塞进总览文档。后续如果需要保留决策历史，可以新增 `docs/decisions/`。
