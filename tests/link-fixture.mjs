import { cp, stat, symlink } from "node:fs/promises";

/** Windows needs admin rights for symlinks: use a junction for directories and a copy for files. */
export async function linkFixture(target, path) {
  if (process.platform !== "win32") return symlink(target, path);
  if ((await stat(target)).isDirectory())
    return symlink(target, path, "junction");
  return cp(target, path);
}
