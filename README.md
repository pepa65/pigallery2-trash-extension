# PiGallery2 Trash Extension

Author: RedialC  |  [中文说明 / Chinese README](README_cn.md)

Features
- Move photo/video to a trash folder instead of deleting it; DB entry is removed so the item disappears immediately.
- Auto-add `__trashX` suffix on name collisions; works across devices (fallback to copy+delete).

Note
- UI may not change instantly after click; the item is already moved to trash and will disappear after the next refresh/reload.

Preview
![Move to trash button](PriviewTrash.jpg)

Config
- `PG2_TRASH_DIR` (default `/app/data/tmp/trash`): target trash folder. Mount it as a persistent volume.

Install & Use (Docker example)
1) Copy `pigallery2-trash-extension` into your PiGallery2 extensions dir, e.g. `/app/data/config/extension/pigallery2-trash-extension`.
2) Ensure the trash folder exists and is writable; e.g. `-e PG2_TRASH_DIR=/app/data/tmp/trash -v /your/trash:/app/data/tmp/trash`.
3) Restart PiGallery2. After login (role >= User) a “move to trash” button appears on the media card.

Troubleshooting
- Move fails: verify `PG2_TRASH_DIR` exists and is writable/mounted; check server logs for the exact error.
