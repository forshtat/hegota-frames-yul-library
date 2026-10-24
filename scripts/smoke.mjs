// Imports the built package through its public `exports` map, the way a consumer would. Run after `yarn build`.
import assert from "node:assert/strict";
import { profiles } from "hegota-frames/profiles";
import { profile as tracer } from "hegota-frames/profiles/ethrex-eip8141-tracer";
import { profile as hegota } from "hegota-frames/profiles/ethrex-hegota-devnet";
import { encodeTx, frame, newTx, secp256k1Placeholder } from "hegota-frames/tx";
import { prelude } from "hegota-frames/yul";
import { prebuilt } from "hegota-frames/yul/prebuilt";

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
assert.match(prelude(tracer), /function approve\(/);
assert.match(prebuilt(tracer.id, "approver"), /^0x[0-9a-f]+$/);
console.log("smoke ok");
