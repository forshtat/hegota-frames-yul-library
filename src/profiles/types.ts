import type { Address } from "viem";

/**
 * A profile is everything that can differ between two devnets: the wire layout of the transaction, the numeric
 * values of modes and opcodes, and the EVM target for compiled Yul. All code in this library takes a profile as an
 * explicit argument; there is no default and no global current profile.
 *
 * A profile is immutable once a devnet depends on it. When a devnet changes its rules, add a new profile and mark the
 * old one `legacy`; never edit the old one (the pinned test vectors fail if you do).
 */
export interface Profile {
  /** Equal to the file name in `src/profiles/` and the key in the registry. */
  id: string;
  title: string;
  /** `legacy`: the devnet it describes is gone or superseded, but the profile stays usable. */
  status: "current" | "legacy";
  supersededBy?: string;
  devnet: {
    description: string;
    chainId?: number;
    /** The execution-client build the profile was checked against. */
    client: string;
  };
  /** EIP number -> the revision or note this profile follows. */
  eips: Record<string, string>;

  /** Type byte of the transaction (`0x06` for frame transactions). */
  txType: number;
  /** Frame mode name -> value. */
  frameModes: Record<string, number>;
  /** Approval scope name -> value (the low bits of a frame's flags and `APPROVE`'s `scope` operand). */
  approveScopes: Record<string, number>;
  /** Other flag bits by name (e.g. `ATOMIC_BATCH`). */
  flagBits: Record<string, number>;
  /** Signature scheme name -> value. */
  sigSchemes: Record<string, number>;
  /** The caller of DEFAULT and VERIFY frames (`ENTRY_POINT`). */
  entryPoint: Address;
  /**
   * Predeployed contracts by EIP constant name (`NONCE_MANAGER`, `RECENT_ROOT_ADDRESS`). Devnets place these
   * differently from the EIP text, so they belong to the profile. Absent means not known on this devnet.
   */
  predeploys: Record<string, Address>;

  /** Top-level field order of the RLP payload. */
  envelope: readonly EnvelopeField[];
}

/**
 * The fields of the RLP payload, in the order a profile lists them.
 *
 *  - `fees`: one nested list `[max_priority_fee_per_gas, max_fee_per_gas, max_fee_per_blob_gas]`
 *  - `maxPriorityFeePerGas`, `maxFeePerGas`, `maxFeePerBlobGas`: the same three as separate top-level items
 */
export type EnvelopeField =
  | "chainId"
  | "nonceKeys"
  | "nonceSeq"
  | "sender"
  | "frames"
  | "signatures"
  | "fees"
  | "maxPriorityFeePerGas"
  | "maxFeePerGas"
  | "maxFeePerBlobGas"
  | "blobVersionedHashes"
  | "recentRootReferences";
