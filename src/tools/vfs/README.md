# VFS Tools

## 概览

VFS tools 让 agent 访问虚拟文件系统。它们通过 VFS workspace service 访问 D1 和 object storage，不直接拼接存储细节。

## 工具

- `vfs.list_dir`
- `vfs.read_file`
- `vfs.write_file`
- `vfs.mkdir`
- `vfs.delete`
- `vfs.move`
- `vfs.search`
- `vfs.command`

## 边界

`vfs.command` 是安全的虚拟命令层，只支持 VFS 内部命令，不执行真实 shell。

默认 workspace 由 admin VFS 初始化动作创建，不作为模型工具暴露。

## 相关文档

- [../../../docs/architecture/STORAGE_MODEL.md](../../../docs/architecture/STORAGE_MODEL.md)
- [../../../specs/vfs.md](../../../specs/vfs.md)
