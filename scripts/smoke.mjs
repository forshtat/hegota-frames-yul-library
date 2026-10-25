// Imports the built package through its public `exports` map, the way a consumer would. Run after `yarn build`.
import assert from "node:assert/strict";
import { profiles } from "@forshtat/hegota-support/profiles";
import { profile as tracer } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { profile as hegota } from "@forshtat/hegota-support/profiles/ethrex-hegota-devnet";
import { toWire } from "@forshtat/hegota-support/rpc";
import { encodeTx, frame, newTx, secp256k1Placeholder } from "@forshtat/hegota-support/tx";

assert.deepEqual(Object.keys(profiles).sort(), [hegota.id, tracer.id].sort());
const tx = newTx({
  chainId: 1337,
  sender: "0x00000000000000000000000000000000000000b1",
  nonceSeq: 0n,
  fees: { maxFeePerGas: 1n },
  signatures: [secp256k1Placeholder(tracer)],
  frames: [frame(tracer, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 1n })],
});
assert.ok(encodeTx(tracer, tx).startsWith("0x06"));
assert.equal(toWire(tx).chainId, "0x539");
console.log("smoke ok");
