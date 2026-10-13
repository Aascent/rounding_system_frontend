#!/usr/bin/env node
/**
 * Remove build output directories, retrying on the transient EBUSY / EPERM /
 * EBADF errors Windows raises while a scanner or editor still has files open.
 *
 * Usage: node ../../tools/clean.mjs dist [more-dirs...]   (run from a package)
 */
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: clean.mjs <dir> [dir...]");
  process.exit(2);
}

for (const target of targets) {
  const path = resolve(process.cwd(), target);
  rmSync(path, {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 250,
  });
  console.log(`cleaned ${path}`);
}
