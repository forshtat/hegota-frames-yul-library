import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profiles } from "../src/profiles/registry.js";
import { decodeTx, encodeTx, sigHash, txHash } from "../src/tx/index.js";
import { samples } from "./samples.js";

// A frozen profile must keep producing exactly these bytes. If this fails after editing a profile or the codec,
// a devnet that runs the old rules would break: add a new profile instead (docs/adding-a-profile.md).
type Vector = { name: string; raw: string; sigHash: string; txHash: string };
const loaded = await Promise.all(
  Object.values(profiles).map(async (profile) => ({
    profile,
    vectors: ((await import(`./vectors/${profile.id}.js`)) as { vectors: readonly Vector[] }).vectors,
    current: await samples(profile),
  })),
);

for (const { profile, vectors, current } of loaded) {
  describe(`pinned vectors: ${profile.id}`, () => {

    it("covers every sample", () => {
      assert.deepEqual(vectors.map((v) => v.name), current.map((s) => s.name));
    });

    for (const [i, v] of vectors.entries()) {
      it(v.name, () => {
        const tx = current[i]!.tx;
        assert.equal(encodeTx(profile, tx), v.raw);
        assert.equal(sigHash(profile, tx), v.sigHash);
        assert.equal(txHash(profile, tx), v.txHash);
        assert.equal(encodeTx(profile, decodeTx(profile, v.raw as `0x${string}`)), v.raw);
      });
    }
  });
}
