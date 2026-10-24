import { privateKeyToAccount } from "viem/accounts";
import type { Profile } from "../src/profiles/types.js";
import { frame, newTx, secp256k1Placeholder, signTx, type FrameTx } from "../src/tx/index.js";

const KEY = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const OWNER = privateKeyToAccount(KEY).address;
const RECIPIENT = "0x8943545177806ED17B9F23F0a21ee5948eCaa776" as const;
const WALLET = "0x00000000000000000000000000000000000000b1" as const;

/** The sample transactions every profile is pinned against. Deterministic: fixed key, fixed fields. */
export async function samples(profile: Profile): Promise<{ name: string; tx: FrameTx }[]> {
  const chainId = profile.devnet.chainId ?? 1;
  const out: { name: string; tx: FrameTx }[] = [];

  out.push({
    name: "self-relay",
    tx: await signTx(
      profile,
      newTx({
        chainId,
        sender: OWNER,
        nonceSeq: 7n,
        fees: { maxFeePerGas: 2_000_000_000n },
        signatures: [secp256k1Placeholder(profile)],
        frames: [
          frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 30_000n }),
          frame(profile, "SENDER", { target: RECIPIENT, execution: 50_000n, state: 200_000n, value: 1_000_000_000n }),
        ],
      }),
      KEY,
    ),
  });

  out.push({
    name: "wallet with explicit signer and verify data",
    tx: await signTx(
      profile,
      newTx({
        chainId,
        sender: WALLET,
        nonceSeq: 1n,
        fees: { maxFeePerGas: 3_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n },
        signatures: [secp256k1Placeholder(profile, OWNER)],
        frames: [
          frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 70_000n, data: "0x01" }),
          frame(profile, "SENDER", { target: RECIPIENT, execution: 50_000n, state: 200_000n, value: 5n }),
        ],
      }),
      KEY,
    ),
  });

  out.push({
    name: "keyed nonces and a recent-root reference",
    tx: await signTx(
      profile,
      {
        ...newTx({
          chainId,
          sender: OWNER,
          nonceKeys: [1n, 2n],
          nonceSeq: 0n,
          fees: { maxFeePerGas: 2_000_000_000n },
          signatures: [secp256k1Placeholder(profile)],
          frames: [frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 30_000n })],
        }),
        recentRootReferences: [{ sourceId: `0x${"11".repeat(32)}`, slot: 1234n, root: `0x${"22".repeat(32)}` }],
      },
      KEY,
    ),
  });

  if (profile.frameModes.POST_TX !== undefined) {
    out.push({
      name: "post-tx assertion",
      tx: await signTx(
        profile,
        newTx({
          chainId,
          sender: OWNER,
          nonceSeq: 3n,
          fees: { maxFeePerGas: 3_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n },
          signatures: [secp256k1Placeholder(profile)],
          frames: [
            frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 30_000n }),
            frame(profile, "SENDER", { target: RECIPIENT, execution: 200_000n, value: 1n }),
            frame(profile, "POST_TX", { target: WALLET, execution: 300_000n, data: "0x1234" }),
          ],
        }),
        KEY,
      ),
    });
  }

  return out;
}

/** The first sample (a plain self-relay), for tests that need one transaction. */
export async function firstSample(profile: Profile): Promise<FrameTx> {
  const [first] = await samples(profile);
  if (!first) throw new Error("no samples");
  return first.tx;
}
