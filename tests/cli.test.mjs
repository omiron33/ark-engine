import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../engine/cli.mjs", import.meta.url));

test("CLI describes the public command set and rejects unsupported input", async () => {
  const { stdout } = await run(process.execPath, [cli, "--help"]);
  assert.match(stdout, /Ark Engine/);
  for (const command of [
    "import",
    "validate",
    "inspect",
    "render",
    "serve",
    "patch",
    "replace",
  ])
    assert.ok(stdout.includes(command));
  for (const args of [
    ["render", "--unexpected"],
    ["render", "--project"],
    ["unknown"],
    ["serve", "--project", "project.json", "--port", "nope"],
  ]) {
    await assert.rejects(
      run(process.execPath, [cli, ...args]),
      (error) => error.code === 1 && error.stderr.length > 0,
    );
  }
});
