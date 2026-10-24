import type { Address, Hex } from "viem";
import type { Profile } from "../profiles/types.js";
import type { FeeParams, Frame, FrameTx, SignatureEntry } from "./types.js";

function lookup(table: Record<string, number>, name: string, what: string, profile: Profile): number {
  const value = table[name];
  if (value === undefined) {
    throw new Error(`Profile "${profile.id}" has no ${what} "${name}". It has: ${Object.keys(table).join(", ") || "(none)"}`);
  }
  return value;
}

export const frameMode = (profile: Profile, name: string): number => lookup(profile.frameModes, name, "frame mode", profile);
export const approveScope = (profile: Profile, name: string): number => lookup(profile.approveScopes, name, "approve scope", profile);
export const sigScheme = (profile: Profile, name: string): number => lookup(profile.sigSchemes, name, "signature scheme", profile);

export interface FrameInit {
  /** `null` (the default) targets the transaction's sender. */
  target?: Address | null;
  execution: bigint;
  state?: bigint;
  value?: bigint;
  data?: Hex;
  /** Raw flag bits, ORed with any `scope`. */
  flags?: number;
  /** An approve scope name from the profile, e.g. `"EXECUTION_AND_PAYMENT"`. */
  scope?: string;
}

/** A frame of the named mode (`"VERIFY"`, `"SENDER"`, `"POST_TX"`, ...). Throws when the profile has no such mode. */
export function frame(profile: Profile, mode: string, init: FrameInit): Frame {
  const scope = init.scope === undefined ? 0 : approveScope(profile, init.scope);
  return {
    mode: frameMode(profile, mode),
    flags: (init.flags ?? 0) | scope,
    target: init.target ?? null,
    limits: { execution: init.execution, state: init.state ?? 0n },
    value: init.value ?? 0n,
    data: init.data ?? "0x",
  };
}

/** A signature entry for a secp256k1 key; `signature` is filled in by `signTx`. */
export function secp256k1Placeholder(profile: Profile, signer: Hex = "0x"): SignatureEntry {
  return { scheme: sigScheme(profile, "SECP256K1"), signer, msg: "0x", signature: "0x" };
}

export interface TxInit {
  chainId: bigint | number;
  sender: Address;
  frames: Frame[];
  signatures: SignatureEntry[];
  nonceSeq: bigint;
  /** Defaults to `[0n]`, the sender's linear account nonce. */
  nonceKeys?: bigint[];
  fees: Partial<FeeParams> & Pick<FeeParams, "maxFeePerGas">;
}

/** A transaction with the optional fields defaulted. `maxPriorityFeePerGas` defaults to `maxFeePerGas`. */
export function newTx(init: TxInit): FrameTx {
  return {
    chainId: BigInt(init.chainId),
    nonceKeys: init.nonceKeys ?? [0n],
    nonceSeq: init.nonceSeq,
    sender: init.sender,
    frames: init.frames,
    signatures: init.signatures,
    fees: {
      maxPriorityFeePerGas: init.fees.maxPriorityFeePerGas ?? init.fees.maxFeePerGas,
      maxFeePerGas: init.fees.maxFeePerGas,
      maxFeePerBlobGas: init.fees.maxFeePerBlobGas ?? 0n,
    },
    blobVersionedHashes: [],
    recentRootReferences: [],
  };
}
