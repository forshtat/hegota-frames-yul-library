import type { Hex } from "viem";
import type { FrameTx } from "../tx/types.js";

const hex = (n: bigint): Hex => `0x${n.toString(16)}`;

/** The JSON form of a transaction that the sidecar's `eth_sendFrameTransaction` takes: bigints as 0x-quantities. */
export function toWire(tx: FrameTx): unknown {
  return {
    chainId: hex(tx.chainId),
    nonceKeys: tx.nonceKeys.map(hex),
    nonceSeq: hex(tx.nonceSeq),
    sender: tx.sender,
    frames: tx.frames.map((f) => ({
      mode: f.mode,
      flags: f.flags,
      target: f.target,
      limits: { execution: hex(f.limits.execution), state: hex(f.limits.state) },
      value: hex(f.value),
      data: f.data,
    })),
    signatures: tx.signatures.map((s) => ({ scheme: s.scheme, signer: s.signer, msg: s.msg, signature: s.signature })),
    fees: {
      maxPriorityFeePerGas: hex(tx.fees.maxPriorityFeePerGas),
      maxFeePerGas: hex(tx.fees.maxFeePerGas),
      maxFeePerBlobGas: hex(tx.fees.maxFeePerBlobGas),
    },
    blobVersionedHashes: tx.blobVersionedHashes,
    recentRootReferences: tx.recentRootReferences.map((r) => ({ sourceId: r.sourceId, slot: hex(r.slot), root: r.root })),
  };
}
