# pigallery-trash-extension
**PiGallery2 Trash Extension**

* Extension for PiGallery2: https://github.com/bpatrik/pigallery2
* Features:
  - Move photo/video to Trash directory after clicking on the Move-to-trash-icon.
  - Database entry gets removed immediately. The thumbnail will disappear after the next refresh/reload.
  - On name collisions in the Trash directory, a `__trash#` suffix gets added to the filename.
  - For moves across device boundaries the fallback is copy & delete.
* Config: the Trash directory can be set in the `PG2_TRASH_DIR` variable (default: `/app/data/trash`).
  Map this directory as a persistent volume to access the trashed files on the host system.
* This extension is using the paths of the docker images.
* Author: RedialC, pepa65
* Repo: https://github.com/pepa65/pigallery2-trash-extension
* After: https://github.com/JDui/pigallery2-trash-extension

## Install & Use (Docker example)
1) Copy the `pigallery2-trash-extension` directory into your PiGallery2 extensions directory
   (default: `/app/data/config/extensions`).
  - The `LICENSE` and `.git` directory can be removed.
2) Ensure the Trash directory exists and is writable.
  - Define the environmental variable (docker: `-e PG2_TRASH_DIR=/app/data/trash`).
  - Map the Trash directory (docker: `-v /host/trash:/app/data/trash`).
3) Restart PiGallery2. After login (role User/Admin/Developer) a Move-to-Trash icon appears on the photo/video in Gallery mode.
### Common problems
* Move fails:
 - Verify if the Trash directory exists and is writable.
 - Verify that the `images` directory is writable (docker: `-v /host/images:/app/data/images:rw`).
 - Check the server logs for the exact error.
