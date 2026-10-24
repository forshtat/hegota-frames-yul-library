import type { Profile } from "./types.js";

/**
 * The public EIP-8141 / alt-mempool devnet (chain 1337): ethrex `eip8141-tracer` plus the Skandha alt-mempool.
 * This is the layout Skandha's own codec (`FrameTxService/codec.ts`) uses, and the one the mempool workshop sends.
 *
 * The devnet's opcodes are not described here: they are the Yul helpers in `yul/erc8421-workshop/`.
 */
export const profile: Profile = {
  id: "ethrex-eip8141-tracer",
  title: "ethrex eip8141-tracer (public alt-mempool devnet, chain 1337)",
  status: "current",
  devnet: {
    description: "https://altmempool.forshtat.com (miner) and https://altmempoolgateway.forshtat.com (gateway)",
    chainId: 1337,
    client: "ghcr.io/forshtat/ethrex:eip8141-tracer-latest",
  },
  eips: {
    "8141": "frame transactions, as implemented by ethrex eip8141-tracer",
    "8250": "keyed nonces (nonce_keys, nonce_seq)",
    "8272": "early revision: top-level recent_root_references payload field. The current EIP text has no such field: it carries the tuples in the data of a VERIFY frame sent to RECENT_ROOT_ADDRESS",
  },

  txType: 0x06,
  frameModes: { DEFAULT: 0, VERIFY: 1, SENDER: 2 },
  approveScopes: { NONE: 0x0, PAYMENT: 0x1, EXECUTION: 0x2, EXECUTION_AND_PAYMENT: 0x3 },
  flagBits: { ATOMIC_BATCH: 0x4 },
  sigSchemes: { ARBITRARY: 0x0, SECP256K1: 0x1, P256: 0x2 },
  entryPoint: "0x00000000000000000000000000000000000000aa",
  // Skandha packages/types/src/contracts/FrameTx.ts. The EIP texts name other addresses
  // (NONCE_MANAGER 0x8250968C12e01A19d6F667b9B2F3b3A4d0e51cB7, RECENT_ROOT_ADDRESS 0x8272D9679689Ea2f307140CdF9002D27dC00Ffff).
  predeploys: {
    NONCE_MANAGER: "0x0000000000000000000000000000000000008250",
    RECENT_ROOT_ADDRESS: "0x0000000000000000000000000000000000008272",
  },

  // [chain_id, nonce_keys, nonce_seq, sender, frames, signatures, fees, blob_versioned_hashes, recent_root_references]
  envelope: [
    "chainId",
    "nonceKeys",
    "nonceSeq",
    "sender",
    "frames",
    "signatures",
    "fees",
    "blobVersionedHashes",
    "recentRootReferences",
  ],
};
