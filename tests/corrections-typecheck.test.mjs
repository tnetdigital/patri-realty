import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
test("F15 uma quebra de tipo na Edge é detectada", () => {
  const p = "supabase/functions/type-regression.ts";
  try {
    writeFileSync(
      p,
      'const edgePayload: number = "invalid"; export {edgePayload};',
    );
    const r = spawnSync(
      "npx",
      ["tsc", "--noEmit", "-p", "tsconfig.edge.json"],
      { encoding: "utf8" },
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /type-regression/);
  } finally {
    unlinkSync(p);
  }
});
