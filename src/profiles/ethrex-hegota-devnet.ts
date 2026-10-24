import type { Profile } from "./types.js";

/**
 * The EIP-7906 devnet (chain 3151908): ethrex `hegota-devnet`. It implements an earlier revision of EIP-7906 than the
 * current text: the mode is called `POST_TX` (the EIP now calls it `ASSERT`), and the opcode bytes are the ones this
 * client picked (the EIP assigns none). The TXTRACE/EVENTDATACOPY tables below are the ones the 7906 workshop uses
 * on that devnet.
 *
 * The 8141 introspection opcodes (`APPROVE`, `SIGPARAM`, ...) are not listed: nothing has exercised them on this
 * devnet yet. Add them, with `verified: "devnet"`, after a test does. `TXDIFF` (0xb8) exists on the devnet but the
 * workshop deliberately does not use it and its stack layout is not recorded, so it is not listed either.
 *
 * The payload carries the three fees as separate top-level items, unlike `ethrex-eip8141-tracer`.
 */
export const profile: Profile = {
  id: "ethrex-hegota-devnet",
  title: "ethrex hegota-devnet (EIP-7906 devnet, chain 3151908)",
  status: "current",
  devnet: {
    description: "the public ethrex Hegota devnet used by the EIP-7906 assertions workshop",
    chainId: 3151908,
    client: "ethrex hegota-devnet branch",
  },
  eips: {
    "8141": "frame transactions, as implemented by ethrex hegota-devnet",
    "8250": "keyed nonces (nonce_keys, nonce_seq)",
    "8272": "early revision: top-level recent_root_references payload field (the current EIP text has none)",
    "7906": "transaction assertions, early revision: POST_TX frames, TXTRACE, EVENTDATACOPY",
  },

  txType: 0x06,
  frameModes: { DEFAULT: 0, VERIFY: 1, SENDER: 2, POST_TX: 3 },
  approveScopes: { NONE: 0x0, PAYMENT: 0x1, EXECUTION: 0x2, EXECUTION_AND_PAYMENT: 0x3 },
  flagBits: {},
  sigSchemes: { SECP256K1: 0x1 },
  entryPoint: "0x00000000000000000000000000000000000000aa",
  predeploys: {}, // not checked on this devnet yet

  // [chain_id, nonce_keys, nonce_seq, sender, frames, signatures,
  //  max_priority_fee_per_gas, max_fee_per_gas, max_fee_per_blob_gas, blob_versioned_hashes, recent_root_references]
  envelope: [
    "chainId",
    "nonceKeys",
    "nonceSeq",
    "sender",
    "frames",
    "signatures",
    "maxPriorityFeePerGas",
    "maxFeePerGas",
    "maxFeePerBlobGas",
    "blobVersionedHashes",
    "recentRootReferences",
  ],

  opcodes: {
    txTrace: {
      byte: 0xb6,
      stack: ["in2", "param"],
      outputs: 1,
      verified: "devnet",
      source: "eip7906-assertions-workshop src/lib/compile.ts (YUL_PRELUDE); only valid inside a POST_TX frame",
    },
    eventDataCopy: {
      byte: 0xb7,
      stack: ["eventIndex", "memOffset", "dataOffset", "length"],
      outputs: 0,
      verified: "devnet",
      source: "eip7906-assertions-workshop src/lib/compile.ts (YUL_PRELUDE); only valid inside a POST_TX frame",
    },
  },

  params: {
    txTrace: {
      BALANCES_CHANGED: 0x00,
      SLOTS_CHANGED: 0x01,
      CODES_DEPLOYED: 0x02,
      BALANCE_ADDRESS: 0x03,
      BALANCE_BEFORE: 0x04,
      BALANCE_AFTER: 0x05,
      SLOT_ADDRESS: 0x06,
      SLOT_KEY: 0x07,
      SLOT_BEFORE: 0x08,
      SLOT_AFTER: 0x09,
      EVENTS_COUNT: 0x0c,
      EVENT_ADDRESS: 0x0d,
      EVENT_TOPIC_COUNT: 0x0e,
      EVENT_TOPIC0: 0x0f,
      EVENT_TOPIC1: 0x10,
      EVENT_TOPIC2: 0x11,
      EVENT_DATA_LENGTH: 0x13,
      GAS_PRECHARGE: 0x14,
      GAS_PAYER: 0x15,
    },
  },

  yul: { evmVersion: "cancun" },
};
