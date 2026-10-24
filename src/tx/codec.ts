import { concat, fromRlp, hexToBigInt, keccak256, numberToHex, toRlp, type Hex } from "viem";
import { sign } from "viem/accounts";
import type { EnvelopeField, Profile } from "../profiles/types.js";
import type { FeeParams, Frame, FrameTx, RecentRootReference, SignatureEntry } from "./types.js";

type Rlp = Hex | Rlp[];

/** RLP integer: zero is the empty string, anything else minimal big-endian bytes. */
function int(n: bigint | number): Hex {
  const b = BigInt(n);
  if (b < 0n) throw new Error(`Cannot RLP-encode a negative integer: ${b}`);
  if (b === 0n) return "0x";
  const h = numberToHex(b);
  return h.length % 2 ? (`0x0${h.slice(2)}` as Hex) : h;
}

const toBig = (h: Rlp): bigint => (h === "0x" ? 0n : hexToBigInt(asBytes(h)));

function asBytes(x: Rlp): Hex {
  if (Array.isArray(x)) throw new Error("Frame tx codec: expected an RLP byte string, got a list");
  return x;
}

function asList(x: Rlp): Rlp[] {
  if (!Array.isArray(x)) throw new Error("Frame tx codec: expected an RLP list, got a byte string");
  return x;
}

const encodeFrame = (f: Frame): Rlp => [int(f.mode), int(f.flags), f.target ?? "0x", [int(f.limits.execution), int(f.limits.state)], int(f.value), f.data];

function decodeFrame(item: Rlp): Frame {
  const [mode, flags, target, limits, value, data] = asList(item);
  const [execution, state] = asList(limits!);
  const targetHex = asBytes(target!);
  return {
    mode: Number(toBig(mode!)),
    flags: Number(toBig(flags!)),
    target: targetHex === "0x" ? null : targetHex,
    limits: { execution: toBig(execution!), state: toBig(state!) },
    value: toBig(value!),
    data: asBytes(data!),
  };
}

const encodeSignature = (s: SignatureEntry): Rlp => [int(s.scheme), s.signer, s.msg, s.signature];

function decodeSignature(item: Rlp): SignatureEntry {
  const [scheme, signer, msg, signature] = asList(item);
  return { scheme: Number(toBig(scheme!)), signer: asBytes(signer!), msg: asBytes(msg!), signature: asBytes(signature!) };
}

const encodeRoot = (r: RecentRootReference): Rlp => [r.sourceId, int(r.slot), r.root];

function decodeRoot(item: Rlp): RecentRootReference {
  const [sourceId, slot, root] = asList(item);
  return { sourceId: asBytes(sourceId!), slot: toBig(slot!), root: asBytes(root!) };
}

/** Rejects a transaction that uses something the profile's payload has no field for, instead of dropping it silently. */
function assertRepresentable(profile: Profile, tx: FrameTx): void {
  const has = (f: EnvelopeField) => profile.envelope.includes(f);
  const hasBlobFee = has("fees") || has("maxFeePerBlobGas");
  const fail = (what: string) => {
    throw new Error(`Profile "${profile.id}" cannot carry ${what}`);
  };
  if (!has("nonceKeys") && tx.nonceKeys.length > 0) fail("nonce keys");
  if (!has("recentRootReferences") && tx.recentRootReferences.length > 0) fail("recent-root references");
  if (!has("blobVersionedHashes") && tx.blobVersionedHashes.length > 0) fail("blob versioned hashes");
  if (!hasBlobFee && tx.fees.maxFeePerBlobGas !== 0n) fail("a blob fee");
  for (const f of tx.frames) {
    if (!Object.values(profile.frameModes).includes(f.mode)) fail(`frame mode ${f.mode}`);
  }
}

function encodeField(field: EnvelopeField, tx: FrameTx): Rlp {
  switch (field) {
    case "chainId":
      return int(tx.chainId);
    case "nonceKeys":
      return tx.nonceKeys.map(int);
    case "nonceSeq":
      return int(tx.nonceSeq);
    case "sender":
      return tx.sender;
    case "frames":
      return tx.frames.map(encodeFrame);
    case "signatures":
      return tx.signatures.map(encodeSignature);
    case "fees":
      return [int(tx.fees.maxPriorityFeePerGas), int(tx.fees.maxFeePerGas), int(tx.fees.maxFeePerBlobGas)];
    case "maxPriorityFeePerGas":
      return int(tx.fees.maxPriorityFeePerGas);
    case "maxFeePerGas":
      return int(tx.fees.maxFeePerGas);
    case "maxFeePerBlobGas":
      return int(tx.fees.maxFeePerBlobGas);
    case "blobVersionedHashes":
      return tx.blobVersionedHashes;
    case "recentRootReferences":
      return tx.recentRootReferences.map(encodeRoot);
  }
}

/** The RLP payload, without the type byte. */
function payload(profile: Profile, tx: FrameTx): Hex {
  assertRepresentable(profile, tx);
  return toRlp(profile.envelope.map((f) => encodeField(f, tx)) as never);
}

const typeByte = (profile: Profile): Hex => numberToHex(profile.txType, { size: 1 });

/** The canonical wire bytes: `type || rlp(payload)`. */
export function encodeTx(profile: Profile, tx: FrameTx): Hex {
  return concat([typeByte(profile), payload(profile, tx)]);
}

/** Inverse of `encodeTx`. Throws when the payload does not have the profile's fields. */
export function decodeTx(profile: Profile, raw: Hex): FrameTx {
  const prefix = typeByte(profile);
  if (!raw.toLowerCase().startsWith(prefix)) throw new Error(`Not a type ${prefix} transaction (profile "${profile.id}")`);
  const items = asList(fromRlp(`0x${raw.slice(prefix.length)}` as Hex, "hex") as Rlp);
  if (items.length !== profile.envelope.length) {
    throw new Error(`Profile "${profile.id}" expects ${profile.envelope.length} payload items, got ${items.length}`);
  }
  const tx: FrameTx = {
    chainId: 0n,
    nonceKeys: [],
    nonceSeq: 0n,
    sender: "0x",
    frames: [],
    signatures: [],
    fees: { maxPriorityFeePerGas: 0n, maxFeePerGas: 0n, maxFeePerBlobGas: 0n },
    blobVersionedHashes: [],
    recentRootReferences: [],
  };
  profile.envelope.forEach((field, i) => {
    const item = items[i]!;
    switch (field) {
      case "chainId":
        tx.chainId = toBig(item);
        break;
      case "nonceKeys":
        tx.nonceKeys = asList(item).map(toBig);
        break;
      case "nonceSeq":
        tx.nonceSeq = toBig(item);
        break;
      case "sender":
        tx.sender = asBytes(item);
        break;
      case "frames":
        tx.frames = asList(item).map(decodeFrame);
        break;
      case "signatures":
        tx.signatures = asList(item).map(decodeSignature);
        break;
      case "fees": {
        const [prio, max, blob] = asList(item);
        const fees: FeeParams = { maxPriorityFeePerGas: toBig(prio!), maxFeePerGas: toBig(max!), maxFeePerBlobGas: toBig(blob!) };
        tx.fees = fees;
        break;
      }
      case "maxPriorityFeePerGas":
        tx.fees.maxPriorityFeePerGas = toBig(item);
        break;
      case "maxFeePerGas":
        tx.fees.maxFeePerGas = toBig(item);
        break;
      case "maxFeePerBlobGas":
        tx.fees.maxFeePerBlobGas = toBig(item);
        break;
      case "blobVersionedHashes":
        tx.blobVersionedHashes = asList(item).map(asBytes);
        break;
      case "recentRootReferences":
        tx.recentRootReferences = asList(item).map(decodeRoot);
        break;
    }
  });
  return tx;
}

/**
 * The hash a signature entry with an empty `msg` signs: keccak256 of the encoding in which the `signature` bytes of
 * every such entry are elided.
 */
export function sigHash(profile: Profile, tx: FrameTx): Hex {
  const elided: FrameTx = {
    ...tx,
    signatures: tx.signatures.map((s) => (s.msg === "0x" ? { ...s, signature: "0x" as Hex } : s)),
  };
  return keccak256(encodeTx(profile, elided));
}

/** keccak256 of the wire bytes. */
export function txHash(profile: Profile, tx: FrameTx): Hex {
  return keccak256(encodeTx(profile, tx));
}

/**
 * Signs `sigHash` with secp256k1 and stores `v || r || s` (v a bare recovery id, 0 or 1) in signature entry
 * `index`. The entry's scheme and signer are left as the caller set them.
 */
export async function signTx(profile: Profile, tx: FrameTx, privateKey: Hex, index = 0): Promise<FrameTx> {
  const entry = tx.signatures[index];
  if (!entry) throw new Error(`The transaction has no signature entry ${index}`);
  const s = await sign({ hash: sigHash(profile, tx), privateKey });
  const parity = s.yParity ?? Number(s.v) - 27;
  const packed = concat([numberToHex(parity, { size: 1 }), s.r, s.s]);
  const signatures = tx.signatures.map((e, i) => (i === index ? { ...e, signature: packed } : e));
  return { ...tx, signatures };
}
