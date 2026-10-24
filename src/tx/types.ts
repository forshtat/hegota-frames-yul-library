import type { Address, Hex } from "viem";

export interface FrameLimits {
  execution: bigint;
  state: bigint;
}

export interface Frame {
  /** A value from the profile's `frameModes`. */
  mode: number;
  /** Bits 0-1: approval scope; other bits as in the profile's `flagBits`. */
  flags: number;
  /** `null` encodes as the empty string: the frame targets `tx.sender`. */
  target: Address | null;
  limits: FrameLimits;
  value: bigint;
  data: Hex;
}

export interface SignatureEntry {
  /** A value from the profile's `sigSchemes`. */
  scheme: number;
  /** `"0x"` for ARBITRARY and for a placeholder that the protocol fills in. */
  signer: Hex;
  /** `"0x"` means the signature covers the canonical signature hash. */
  msg: Hex;
  signature: Hex;
}

export interface FeeParams {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  /** Profiles whose payload has no blob fee field require this to be 0. */
  maxFeePerBlobGas: bigint;
}

/** The early EIP-8272 payload field: a declared `(source_id, slot, root)` tuple. */
export interface RecentRootReference {
  sourceId: Hex;
  slot: bigint;
  root: Hex;
}

export interface FrameTx {
  chainId: bigint;
  /** EIP-8250 keyed nonces. `[0n]` is the sender's linear account nonce. */
  nonceKeys: bigint[];
  nonceSeq: bigint;
  sender: Address;
  frames: Frame[];
  signatures: SignatureEntry[];
  fees: FeeParams;
  blobVersionedHashes: Hex[];
  recentRootReferences: RecentRootReference[];
}
