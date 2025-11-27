/**
 * PiGallery2 extension: move-to-trash delete (non-destructive) + inline placeholder indicator without page reload.
 * Place this folder in the PiGallery2 extension directory and restart the app.
 */
const path = require('path');
const fsp = require('fs').promises;
const sharp = require('sharp');

const UserRoles = {LimitedGuest: 1, Guest: 2, User: 3, Admin: 4, Developer: 5};
const TRASH_DIR = process.env.PG2_TRASH_DIR || '/app/data/tmp/trash';
const STATE_FILE = path.join(__dirname, 'deleted-state.json');

const normalizeRel = (rel) => path.normalize(rel || '').replace(/^[./\\]+/, '').replace(/\\/g, '/');

const ensureDirExists = async (dir) => {
  await fsp.mkdir(dir, {recursive: true});
};

// If destination exists, add __trashN suffix
const ensureUniquePath = async (target) => {
  let candidate = target;
  let counter = 1;
  const parsed = path.parse(target);
  while (true) {
    try {
      await fsp.stat(candidate);
      candidate = path.join(parsed.dir, `${parsed.name}__trash${counter}${parsed.ext}`);
      counter += 1;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return candidate;
      }
      throw err;
    }
  }
};

const buildAbsoluteMediaPath = (extension, media) => {
  const dirPath = media?.directory?.path || '.';
  const dirName = media?.directory?.name || '';
  return path.normalize(path.join(extension.paths.ImageFolder, dirPath, dirName, media.name));
};

const mediaRelativePath = (extension, media) => {
  const absolute = buildAbsoluteMediaPath(extension, media);
  return normalizeRel(path.relative(extension.paths.ImageFolder, absolute));
};

const relativeFromInputPath = (extension, mediaPath) => {
  return normalizeRel(path.relative(extension.paths.ImageFolder, mediaPath));
};

const deletedState = {
  set: new Set(),
  async load(logger) {
    try {
      const raw = await fsp.readFile(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      this.set = new Set(parsed.items || []);
      logger?.info?.(`[trash-ext] Loaded ${this.set.size} deleted entries`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger?.warn?.('[trash-ext] Failed to load deleted-state.json', err);
      }
      this.set = new Set();
    }
  },
  async save(logger) {
    await fsp.writeFile(STATE_FILE, JSON.stringify({items: [...this.set]}, null, 2), 'utf-8');
    logger?.silly?.(`[trash-ext] Saved ${this.set.size} deleted entries`);
  },
  async add(rel, logger) {
    this.set.add(rel);
    await this.save(logger);
  },
  has(rel) {
    return this.set.has(rel);
  }
};

let placeholderPath = null;
const ensurePlaceholder = async (extension) => {
  if (placeholderPath) {
    return placeholderPath;
  }
  const target = path.join(extension.paths.TempFolder, 'trash-placeholder.png');
  await ensureDirExists(path.dirname(target));
  try {
    await fsp.stat(target);
  } catch {
    // create simple 600x600 black square (fast to generate)
    const size = 600;
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: {r: 0, g: 0, b: 0, alpha: 255}
      }
    }).png({compressionLevel: 9}).toFile(target);
  }
  placeholderPath = target;
  return target;
};

const moveMediaToTrash = async (extension, media, repository, logger) => {
  const absolute = buildAbsoluteMediaPath(extension, media);
  const relRaw = path.relative(extension.paths.ImageFolder, absolute);
  if (relRaw.startsWith('..')) {
    throw new Error('Media path outside image folder');
  }
  const rel = normalizeRel(relRaw);
  let dest = path.normalize(path.join(TRASH_DIR, rel));
  await ensureDirExists(path.dirname(dest));
  dest = await ensureUniquePath(dest);

  const copyThenDelete = async () => {
    await fsp.copyFile(absolute, dest);
    await fsp.unlink(absolute);
  };

  try {
    await fsp.rename(absolute, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      await copyThenDelete();
    } else {
      throw err;
    }
  }

  await repository.delete(media.id);
  await deletedState.add(rel, logger);
  logger?.info?.(`[trash-ext] Moved to trash: ${rel} -> ${dest}`);
};

module.exports.init = async (extension) => {
  const logger = extension.Logger;
  await deletedState.load(logger);
  await ensurePlaceholder(extension);

  extension.ui.addMediaButton({
    name: 'move-to-trash',
    svgIcon: {
      viewBox: '0 0 448 512',
      items: '<path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96h384c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.4 0 284.2 0H163.8c-12.2 0-23.2 6.8-28.6 17.7zM53.2 467c1.3 25.3 22.2 45 47.5 45h246.6c25.3 0 46.2-19.7 47.5-45L416 128H32l21.2 339z"/>'
    },
    apiPath: 'move-to-trash',
    reloadContent: false, // avoid page reload; placeholder swap handles visual cue
    minUserRole: UserRoles.User,
    skipDirectoryInvalidation: false,
    popup: {
      header: '移动到回收站',
      body: `File will be moved to ${TRASH_DIR} (no physical delete; you can clean it manually). 界面不会立即消失，刷新页面后从列表中移除。`,
      buttonString: '移动',
      customFields: [
        {
          id: 'confirm',
          label: '确认移动 / Confirm',
          type: 'boolean',
          defaultValue: false,
          required: true
        }
      ]
    }
  }, async (_params, _body, _user, media, repository) => {
    await moveMediaToTrash(extension, media, repository, logger);
  });

  // Render hook: show placeholder for deleted items without reloading the page
  extension.events.gallery.ImageRenderer.render.before(async (input) => {
    const job = input?.[0];
    if (!job || !job.mediaPath) {
      return input;
    }
    try {
      const rel = relativeFromInputPath(extension, job.mediaPath);
      if (!deletedState.has(rel)) {
        return input;
      }
      job.mediaPath = await ensurePlaceholder(extension);
      return input;
    } catch (err) {
      logger?.error?.('[trash-ext] render.before failed', err);
      return input;
    }
  });

  logger.info('[trash-ext] Extension initialized (trash only, inline indicator)');
};

module.exports.cleanUp = async (extension) => {
  extension.Logger?.info?.('[trash-ext] Cleaning up');
};
