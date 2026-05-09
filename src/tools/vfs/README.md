# VFS Tool

虚拟文件系统工具。

提供：

- `vfs.list_dir`
- `vfs.read_file`
- `vfs.write_file`
- `vfs.mkdir`
- `vfs.delete`
- `vfs.move`
- `vfs.search`
- `vfs.command`

底层通过 VFS workspace service 访问 D1/R2，不直接在 tool 里拼接存储细节。
`vfs.command` 是安全的虚拟命令层，只支持 VFS 内部命令，不执行真实 shell。
