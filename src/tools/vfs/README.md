# VFS Tool

虚拟文件系统工具。

提供：

- listDir
- readFile
- writeFile
- deletePath
- movePath
- stat

底层使用 storage 层访问 D1/R2，不直接在 tool 里拼接存储细节。
