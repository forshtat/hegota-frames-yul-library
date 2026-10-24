# hegota-frames

Helpers for the Hegota frame-transaction EIPs: **8141** (frame transactions), **8250** (keyed nonces),
**8272** (recent roots) and **7906** (transaction assertions). The EIPs are moving, and every devnet
implements a different revision, so everything here is parameterised by a **profile**: one named, frozen
description of one devnet's rules.

The library is two independent pieces:

| | Import | What it is |
|---|---|---|
| **TypeScript tooling** | `hegota-frames/tx` | Build, encode, decode, hash and sign frame transactions for a profile |
| **Yul API for frames** | `hegota-frames/yul` | Named Yul functions for the frame opcodes (`approve`, `sigparam`, `txtrace`, ...), a compiler wrapper, and ready-made helper contracts |
| Profiles | `hegota-frames/profiles` | The registry, and `hegota-frames/profiles/<id>` for a single profile |

> Not published to npm yet (`"private": true`). Depend on it by git URL until the first release.

## Pick a profile explicitly

There is no default profile and no "current devnet". Every function takes the profile as its first argument, so a
script written for one devnet keeps working, byte for byte, after another devnet appears.

```ts
import { profile } from "hegota-frames/profiles/ethrex-eip8141-tracer";
import { frame, newTx, secp256k1Placeholder, signTx, encodeTx, txHash } from "hegota-frames/tx";

const tx = await signTx(
  profile,
  newTx({
    chainId: 1337,
    sender: account.address,
    nonceSeq: 7n,
    fees: { maxFeePerGas: 2_000_000_000n },
    signatures: [secp256k1Placeholder(profile)],
    frames: [
      frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", execution: 30_000n }),
      frame(profile, "SENDER", { target: recipient, execution: 50_000n, state: 200_000n, value: 1n }),
    ],
  }),
  privateKey,
);
const raw = encodeTx(profile, tx); // 0x06 || rlp(payload), laid out the way this devnet expects
```

Importing a single profile file (as above) pulls in only that profile. `getProfile(id)` and `profiles` from
`hegota-frames/profiles` look them up by id and pull in all of them. A frame mode a profile does not have is an
error that names the modes it does have: `frame(profile, "POST_TX", ...)` throws on the tracer profile.

## The Yul API

Solidity cannot emit the frame opcodes. Yul can, with `verbatim`, and this library gives each opcode a name.
Operands are always listed **top of the stack first**, exactly as in the EIP's stack tables.

```ts
import { profile } from "hegota-frames/profiles/ethrex-eip8141-tracer";
import { compileYul, prelude } from "hegota-frames/yul";

const { bytecode } = compileYul(profile, "approver", `approve(0, 0, calldataload(0))`);
console.log(prelude(profile)); // every function and constant you can call, with its opcode and how well it is verified
```

`prelude(profile)` defines, for that profile only:

- opcodes: `approve(offset, length, scope)`, `txparam(param)`, `frameparam(frameIndex, param)`,
  `sigparam(signatureIndex, param)`, `framedataload`, `framedatacopy`, `sigdatacopy`; on the 7906 profile
  `txtrace(in2, param)` and `eventdatacopy(eventIndex, memOffset, dataOffset, length)`
- parameter constants: `TXPARAM_NONCE()`, `FRAMEPARAM_MODE()`, `SIGPARAM_RESOLVED_SIGNER()`, `TXTRACE_BALANCE_AFTER()`
- `FRAME_MODE_VERIFY()`, `APPROVE_EXECUTION_AND_PAYMENT()`, `SIG_SCHEME_SECP256K1()`

Using something the profile does not define fails before the compiler runs, with the profile and the name:
`Profile "ethrex-hegota-devnet" does not define: opcode approve()`.

`compileYul` needs `solc` (an optional peer dependency, pinned to `0.8.28` so output is reproducible). Consumers
that do not want a compiler use the prebuilt contracts:

```ts
import { prebuilt } from "hegota-frames/yul/prebuilt";
const approverInitCode = prebuilt("ethrex-eip8141-tracer", "approver"); // creation bytecode, no solc needed
```

| Contract | What it does |
|---|---|
| `approver` | `APPROVE` with the scope from calldata. `delegatecall` it from VERIFY-frame code (APPROVE acts on the executing account) |
| `signerReader` | Returns the resolved signer of signature 0. `staticcall` it from VERIFY-frame code |

A contract exists for a profile only if the profile has the opcodes it needs.

## Profiles

| Id | Devnet | Status | Payload layout | Frame modes |
|---|---|---|---|---|
| `ethrex-eip8141-tracer` | public alt-mempool devnet, chain 1337 | current | fees as one nested list; 9 items | DEFAULT, VERIFY, SENDER |
| `ethrex-hegota-devnet` | EIP-7906 devnet, chain 3151908 | current | three fee items; 11 items | + POST_TX |

The two layouts differ on the wire, so the same transaction encodes differently under each. Decoding with the
wrong profile fails with a count mismatch instead of misreading.

### How much to trust an opcode

Each opcode in a profile carries `verified` and `source`:

- `devnet`: exercised on that devnet by a workshop or a test. The byte and the stack order are known good.
- `spec`: copied from the EIP text. May differ from what the client implements.

The 7906 profile deliberately lists only `TXTRACE` and `EVENTDATACOPY` until something exercises the 8141
opcodes there.

### Where devnets already differ from the EIP text

- **8272 recent roots.** Both devnets carry a top-level `recent_root_references` payload field. The current EIP
  text has no such field: tuples travel in the data of a VERIFY frame sent to `RECENT_ROOT_ADDRESS`
  (`encodeRecentRootData` builds that data).
- **Predeploys.** The tracer devnet puts `NONCE_MANAGER` and `RECENT_ROOT_ADDRESS` at `0x...8250` and
  `0x...8272`; the EIP texts name other addresses. Predeploys live in the profile.
- **`TXPARAM 0x06`.** Not in the EIP text; ethrex answers it with the transaction's maximum cost.

## Adding, retiring and removing a profile

See [docs/adding-a-profile.md](docs/adding-a-profile.md). In short: `yarn new-profile <id> --from <other> --supersede`,
edit the new file, `yarn pin-vectors <id>`, `yarn build:yul`, `yarn verify`. The old profile stays, marked
`legacy`, and keeps producing the same bytes: its pinned test vectors fail if anything changes them.

## Not here yet

- Skandha's `eth_sendFrameTransaction` JSON shape (still in the workshops)
- Workshop-level transaction builders with their gas numbers (they stay in the workshops)
- 8141 introspection opcodes on the 7906 profile (unverified there)

## Development

```sh
yarn install
yarn verify        # typecheck, test, build, smoke-test the exports, check the generated Yul is current
```

Tests run on Node's built-in runner after compiling with `tsc`; there is no test framework dependency. CI runs
`yarn verify` on Node 20, 22 and 24.
