import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profiles } from "../src/profiles/registry.js";
import { toWire } from "../src/rpc/index.js";
import { frame, newTx, secp256k1Placeholder } from "../src/tx/index.js";

for (const profile of Object.values(profiles)) {
  describe(`toWire: ${profile.id}`, () => {
    const tx = newTx({
      chainId: 1337,
      sender: "0x00000000000000000000000000000000000000b1",
      nonceSeq: 8n,
      fees: { maxFeePerGas: 255n },
      signatures: [secp256k1Placeholder(profile)],
      frames: [
        frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 30_000n }),
        frame(profile, "SENDER", { target: "0x00000000000000000000000000000000000000c2", execution: 50_000n, state: 200_000n, value: 1n }),
      ],
    });
    const wire = toWire(tx) as any;

    it("writes every bigint as a 0x-quantity", () => {
      assert.equal(wire.chainId, "0x539");
      assert.deepEqual(wire.nonceKeys, ["0x0"]);
      assert.equal(wire.nonceSeq, "0x8");
      assert.deepEqual(wire.fees, { maxPriorityFeePerGas: "0xff", maxFeePerGas: "0xff", maxFeePerBlobGas: "0x0" });
      assert.deepEqual(wire.frames[1].limits, { execution: "0xc350", state: "0x30d40" });
      assert.equal(wire.frames[1].value, "0x1");
    });

    it("keeps modes, flags, targets and data as they are", () => {
      assert.equal(wire.frames[0].mode, tx.frames[0]!.mode);
      assert.equal(wire.frames[0].flags, tx.frames[0]!.flags);
      assert.equal(wire.frames[0].target, null);
      assert.equal(wire.frames[1].target, "0x00000000000000000000000000000000000000c2");
      assert.equal(wire.frames[0].data, "0x");
    });

    it("survives JSON", () => {
      assert.deepEqual(JSON.parse(JSON.stringify(wire)), wire);
    });
  });
}
