import type { Profile } from "./types.js";

/**
 * The public EIP-8141 / alt-mempool devnet (chain 1337): ethrex `eip8141-tracer` plus the Skandha alt-mempool.
 * This is the layout Skandha's own codec (`FrameTxService/codec.ts`) uses, and the one the mempool workshop sends.
 *
 * Opcode bytes and stack orders marked `devnet` were exercised by the mempool workshop (wallets approve with
 * `APPROVE` and read the signer with `SIGPARAM`). The rest come from the EIP-8141 text (as of 2026-10-24) and are
 * marked `spec` until something exercises them here.
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

  opcodes: {
    approve: {
      byte: 0xaa,
      stack: ["offset", "length", "scope"],
      outputs: 0,
      verified: "devnet",
      source: "mempool workshop: approver runtime 60003560006000aa; EIP-8141 APPROVE (ends the frame like RETURN)",
    },
    txParam: { byte: 0xb0, stack: ["param"], outputs: 1, verified: "spec", source: "EIP-8141 TXPARAM" },
    frameDataLoad: { byte: 0xb1, stack: ["offset", "frameIndex"], outputs: 1, verified: "spec", source: "EIP-8141 FRAMEDATALOAD" },
    frameDataCopy: {
      byte: 0xb2,
      stack: ["memOffset", "dataOffset", "length", "frameIndex"],
      outputs: 0,
      verified: "spec",
      source: "EIP-8141 FRAMEDATACOPY",
    },
    frameParam: { byte: 0xb3, stack: ["frameIndex", "param"], outputs: 1, verified: "spec", source: "EIP-8141 FRAMEPARAM" },
    sigParam: {
      byte: 0xb4,
      stack: ["signatureIndex", "param"],
      outputs: 1,
      verified: "devnet",
      source: "mempool workshop: signer-reader runtime 60006000b460005260206000f3 (SIGPARAM(0, RESOLVED_SIGNER)); EIP-8141 SIGPARAM",
    },
    sigDataCopy: {
      byte: 0xb5,
      stack: ["memOffset", "dataOffset", "length", "signatureIndex"],
      outputs: 0,
      verified: "spec",
      source: "EIP-8141 SIGDATACOPY",
    },
  },

  params: {
    // EIP-8141 Introspection tables; EIP-8250 adds 0x0d-0x10. 0x05 is unlisted in the EIP text, and the EIP does
    // not list 0x06 either: ethrex answers it with the transaction's maximum cost (Skandha reads it as `maxCost`).
    txParam: {
      TYPE: 0x00,
      NONCE: 0x01,
      SENDER: 0x02,
      MAX_PRIORITY_FEE_PER_GAS: 0x03,
      MAX_FEE: 0x04,
      MAX_COST: 0x06,
      BLOB_COUNT: 0x07,
      SIG_HASH: 0x08,
      FRAME_COUNT: 0x09,
      CURRENT_FRAME_INDEX: 0x0a,
      SIGNATURE_COUNT: 0x0b,
      STATE_GAS_LEFT: 0x0c,
      LEGACY_NONCE: 0x0d,
      NONCE_KEY_COUNT: 0x0e,
      NONCE_KEYS_HASH: 0x0f,
      NONCE_KEY_0: 0x10,
    },
    frameParam: {
      RESOLVED_TARGET: 0x00,
      EXECUTION_GAS_LIMIT: 0x01,
      MODE: 0x02,
      FLAGS: 0x03,
      DATA_LENGTH: 0x04,
      STATUS: 0x05,
      ALLOWED_SCOPE: 0x06,
      ATOMIC_BATCH: 0x07,
      VALUE: 0x08,
      STATE_GAS_LIMIT: 0x09,
      EXECUTION_GAS_USED: 0x0a,
      STATE_GAS_USED: 0x0b,
    },
    sigParam: {
      RESOLVED_SIGNER: 0x00,
      SCHEME: 0x01,
      MSG: 0x02,
      SIGNATURE_LENGTH: 0x03,
    },
  },

  yul: {
    evmVersion: "paris",
    note: "the workshop's hand-written helpers avoided PUSH0; why is not recorded, so the target stays at paris until someone checks",
  },
};
