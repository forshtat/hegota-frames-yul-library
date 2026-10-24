import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromRlp, recoverAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { profiles } from "../src/profiles/registry.js";
import { decodeTx, encodeTx, frame, newTx, secp256k1Placeholder, signTx, sigHash, txHash } from "../src/tx/index.js";
import { firstSample, samples } from "./samples.js";

const KEY = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const OWNER = privateKeyToAccount(KEY).address;

for (const profile of Object.values(profiles)) {
  describe(`codec: ${profile.id}`, () => {
    it("encodes with the type byte and round-trips every sample", async () => {
      for (const { name, tx } of await samples(profile)) {
        const raw = encodeTx(profile, tx);
        assert.ok(raw.startsWith("0x06"), name);
        const back = decodeTx(profile, raw);
        assert.equal(encodeTx(profile, back), raw, name);
        assert.equal(back.nonceSeq, tx.nonceSeq, name);
        assert.equal(back.frames.length, tx.frames.length, name);
      }
    });

    it("the payload has exactly the profile's envelope items", async () => {
      const tx = await firstSample(profile);
      const items = fromRlp(`0x${encodeTx(profile, tx).slice(4)}` as Hex, "hex") as unknown[];
      assert.equal(items.length, profile.envelope.length);
    });

    it("signs over a hash that does not include the signature, and the signature recovers to the signer", async () => {
      const tx = await firstSample(profile);
      const unsigned = { ...tx, signatures: [secp256k1Placeholder(profile)] };
      assert.equal(sigHash(profile, unsigned), sigHash(profile, tx));
      assert.notEqual(txHash(profile, unsigned), txHash(profile, tx));
      const packed = tx.signatures[0]!.signature;
      assert.equal((packed.length - 2) / 2, 65);
      const v = Number(`0x${packed.slice(2, 4)}`);
      assert.ok(v === 0 || v === 1);
      const recovered = await recoverAddress({ hash: sigHash(profile, tx), signature: { r: `0x${packed.slice(4, 68)}`, s: `0x${packed.slice(68, 132)}`, v: BigInt(v + 27) } });
      assert.equal(recovered, OWNER);
    });

    it("changing a frame changes the signature hash", async () => {
      const tx = await firstSample(profile);
      const changed = { ...tx, frames: tx.frames.slice(0, 1) };
      assert.notEqual(sigHash(profile, changed), sigHash(profile, tx));
    });

    it("refuses a frame mode the profile does not have, naming the modes it has", () => {
      assert.throws(() => frame(profile, "NOPE", { execution: 1n }), new RegExp(`Profile "${profile.id}" has no frame mode "NOPE"`));
    });
  });
}

describe("codec: profiles differ on the wire", () => {
  it("the same transaction encodes differently under different envelopes", async () => {
    const tracer = profiles["ethrex-eip8141-tracer"]!;
    const hegota = profiles["ethrex-hegota-devnet"]!;
    const mk = (p: typeof tracer) =>
      newTx({ chainId: 1, sender: OWNER, nonceSeq: 0n, fees: { maxFeePerGas: 5n }, signatures: [secp256k1Placeholder(p)], frames: [frame(p, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 1n })] });
    assert.notEqual(encodeTx(tracer, mk(tracer)), encodeTx(hegota, mk(hegota)));
    assert.equal((fromRlp(`0x${encodeTx(tracer, mk(tracer)).slice(4)}` as Hex, "hex") as unknown[]).length, 9);
    assert.equal((fromRlp(`0x${encodeTx(hegota, mk(hegota)).slice(4)}` as Hex, "hex") as unknown[]).length, 11);
  });

  it("decoding with the wrong profile fails loudly instead of misreading", async () => {
    const tracer = profiles["ethrex-eip8141-tracer"]!;
    const hegota = profiles["ethrex-hegota-devnet"]!;
    const tx = await firstSample(tracer);
    assert.throws(() => decodeTx(hegota, encodeTx(tracer, tx)), /expects 11 payload items, got 9/);
  });

  it("POST_TX frames exist only where the profile has the mode", () => {
    const tracer = profiles["ethrex-eip8141-tracer"]!;
    assert.throws(() => frame(tracer, "POST_TX", { execution: 1n }), /no frame mode "POST_TX"/);
    assert.equal(frame(profiles["ethrex-hegota-devnet"]!, "POST_TX", { execution: 1n }).mode, 3);
  });
});

describe("codec: representability", () => {
  it("rejects a field the profile's payload cannot carry instead of dropping it", async () => {
    const hegota = { ...profiles["ethrex-hegota-devnet"]!, envelope: ["chainId", "sender", "frames", "signatures", "maxPriorityFeePerGas", "maxFeePerGas"] as const };
    const tx = await firstSample(profiles["ethrex-hegota-devnet"]!);
    assert.throws(() => encodeTx({ ...hegota, id: "x" }, { ...tx, nonceKeys: [1n] }), /cannot carry nonce keys/);
    assert.throws(() => encodeTx({ ...hegota, id: "x" }, { ...tx, nonceKeys: [], fees: { ...tx.fees, maxFeePerBlobGas: 1n } }), /cannot carry a blob fee/);
  });

  it("signTx rejects a missing signature entry", async () => {
    const p = profiles["ethrex-eip8141-tracer"]!;
    const tx = await firstSample(p);
    await assert.rejects(signTx(p, tx, KEY, 5), /no signature entry 5/);
  });
});
