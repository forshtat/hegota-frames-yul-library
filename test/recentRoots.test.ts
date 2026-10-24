import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeRecentRootData } from "../src/tx/index.js";

const ref = (slot: bigint) => ({ sourceId: `0x${"11".repeat(32)}` as const, slot, root: `0x${"22".repeat(32)}` as const });

describe("encodeRecentRootData (current EIP-8272 frame data)", () => {
  it("concatenates 72-byte tuples: source_id || slot (8 bytes, big-endian) || root", () => {
    const data = encodeRecentRootData([ref(1234n), ref(5n)]);
    assert.equal((data.length - 2) / 2, 144);
    assert.equal(data.slice(2, 66), "11".repeat(32));
    assert.equal(data.slice(66, 82), "00000000000004d2"); // 1234
    assert.equal(data.slice(82, 146), "22".repeat(32));
    assert.equal(data.slice(146 + 64, 146 + 80), "0000000000000005");
  });

  it("takes 1 to 16 references and a uint64 slot", () => {
    assert.throws(() => encodeRecentRootData([]), /1 to 16/);
    assert.throws(() => encodeRecentRootData(Array.from({ length: 17 }, () => ref(1n))), /1 to 16/);
    assert.throws(() => encodeRecentRootData([ref(2n ** 64n)]), /uint64/);
    assert.throws(() => encodeRecentRootData([{ ...ref(1n), root: "0x1234" }]), /32 bytes/);
  });
});
