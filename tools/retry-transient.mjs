#!/usr/bin/env node
/**
 * Run a command; if it fails with a *transient* file-system error, run it again.
 *
 * On Windows, antivirus / the search indexer / an editor's language server can
 * briefly hold a freshly written build artefact open, which makes the next
 * write fail with EBADF / EBUSY / EPERM (surfacing in `tsc` as TS5033). Those
 * failures clear on their own within a second or two, so a short backoff
 * retry is enough. Any other failure is returned immediately, unchanged.
 *
 * Usage: node tools/retry-transient.mjs <command> [args...]
 */
import { spawn } from "node:child_process";

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error("usage: retry-transient.mjs <command> [args...]");
  process.exit(2);
}

const TRANSIENT = /\b(EBADF|EBUSY|EPERM|EACCES|TS5033)\b/;
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;
const MAX_CAPTURE = 256 * 1024;

/** Quote an argument for the shell so spaces/quotes survive the round-trip. */
function quote(arg) {
  if (/^[\w@%+=:,./\\-]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["\\])/g, "\\$1")}"`;
}

function run() {
  return new Promise((resolve) => {
    // A shell is required on Windows to resolve `.cmd` shims such as `tsc`.
    const child = spawn(command.map(quote).join(" "), {
      shell: true,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let captured = "";
    const forward = (stream, sink) =>
      stream.on("data", (chunk) => {
        sink.write(chunk);
        if (captured.length < MAX_CAPTURE) captured += chunk.toString();
      });
    forward(child.stdout, process.stdout);
    forward(child.stderr, process.stderr);
    child.on("close", (code) => resolve({ code: code ?? 1, output: captured }));
  });
}

for (let attempt = 1; ; attempt += 1) {
  const { code, output } = await run();
  if (code === 0) process.exit(0);
  if (attempt >= MAX_ATTEMPTS || !TRANSIENT.test(output)) process.exit(code);
  const delay = BASE_DELAY_MS * attempt;
  console.error(
    `\n[retry-transient] transient file-lock error; retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})\n`,
  );
  await new Promise((r) => setTimeout(r, delay));
}
