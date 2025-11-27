# PiGallery2 回收站拓展

作者：RedialC  |  [English README](README.md)

功能
- 将照片/视频移动到回收站目录（不做物理删除），同时从数据库移除，界面立即消失。
- 目标重名会自动追加 `__trashX` 后缀；跨设备路径会退化为复制+删除。

提示
- 点击后界面可能不会立刻变化，文件已移动到回收站，刷新/重新载入后列表会消失。

示例
![移到回收站按钮](PriviewTrash.jpg)

配置
- `PG2_TRASH_DIR`（默认 `/app/data/tmp/trash`）：回收站目录，建议挂载为持久卷。

安装与使用（Docker 示例）
1) 把 `pigallery2-trash-extension` 目录放到扩展目录，例如 `/app/data/config/extension/pigallery2-trash-extension`。
2) 确保回收站目录存在且可写，例如 `-e PG2_TRASH_DIR=/app/data/tmp/trash -v /your/trash:/app/data/tmp/trash`。
3) 重启 PiGallery2。登录（角色 ≥ User）后，媒体卡片左上角会出现“移到回收站”按钮。

常见问题
- 移动失败：检查 `PG2_TRASH_DIR` 是否存在/可写、是否挂载为持久卷，或查看服务器日志获取具体错误。
