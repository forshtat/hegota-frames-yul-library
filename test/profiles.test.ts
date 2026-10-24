import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { getProfile, profiles } from "../src/profiles/registry.js";

// build/test/ -> repo root
const root = fileURLToPath(new URL("../../", import.meta.url));
const NOT_PROFILES = new Set(["types", "registry", "index"]);

describe("profile registry", () => {
  const files = fs
    .readdirSync(`${root}src/profiles`)
    .filter((f) => f.endsWith(".ts") && !NOT_PROFILES.has(f.slice(0, -3)))
    .map((f) => f.slice(0, -3))
    .sort();

  it("registers exactly the profile files, keyed by their id", () => {
    assert.deepEqual(Object.keys(profiles).sort(), files);
    for (const [key, p] of Object.entries(profiles)) assert.equal(p.id, key);
  });

  it("every profile has pinned vectors", () => {
    for (const id of Object.keys(profiles)) {
      assert.ok(fs.existsSync(`${root}test/vectors/${id}.ts`), `missing test/vectors/${id}.ts: run yarn pin-vectors ${id}`);
    }
  });

  it("superseded profiles point at a profile that exists", () => {
    for (const p of Object.values(profiles)) {
      if (p.status === "legacy" && p.supersededBy !== undefined) assert.ok(p.supersededBy in profiles, `${p.id} -> ${p.supersededBy}`);
      if (p.status === "current") assert.equal(p.supersededBy, undefined);
    }
  });

  it("every envelope names each of chainId, sender, frames and signatures once and has no duplicates", () => {
    for (const p of Object.values(profiles)) {
      assert.equal(new Set(p.envelope).size, p.envelope.length, p.id);
      for (const f of ["chainId", "sender", "frames", "signatures"] as const) assert.ok(p.envelope.includes(f), `${p.id} lacks ${f}`);
    }
  });

  it("getProfile explains an unknown id", () => {
    assert.throws(() => getProfile("nope"), /Unknown profile "nope".*ethrex-eip8141-tracer/);
  });
});
