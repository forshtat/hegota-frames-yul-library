# hegota-frames

Helpers for the Hegota frame-transaction EIPs: **8141** (frame transactions), **8250** (keyed nonces),
**8272** (recent roots) and **7906** (transaction assertions). The EIPs are moving, and every devnet
implements a different revision, so everything here is parameterised by a **profile**: one named, frozen
description of one devnet's rules.

The library is two independent pieces:

| | Import | What it is |
|---|---|---|
| **TypeScript tooling** | `hegota-frames/tx` | Build, encode, decode, hash and sign frame transactions for a profile |
| **JSON-RPC wire format** | `hegota-frames/rpc` | `toWire(tx)`, `rpc()` (a JSON-RPC call that throws `RpcError`), `explainRejection()` (node error text to a rule family) |
| **Frame opcodes in Solidity** | `hegota-frames/contracts/HegotaSupport.sol` | An abstract contract: `approve`, `txparam`, `sigparam`, `txtrace`, ... as Solidity functions, with named parameter ids |
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

## HegotaSupport: the frame opcodes in Solidity

Solidity cannot emit the frame opcodes. `HegotaSupport` gives every one of them a function. Inherit it and name your
devnet:

```solidity
import {HegotaSupport, Devnet, Scope, SigParam} from "hegota-frames/contracts/HegotaSupport.sol";

contract VasiliyPaymaster is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public immutable OWNER = msg.sender;

    fallback() external {
        require(address(uint160(sigparam(0, SigParam.RESOLVED_SIGNER))) == OWNER, "bad signer");
        approve(Scope.PAYMENT);
    }
}
```

| Function | Opcode | Devnets |
|---|---|---|
| `approve(scope)` | APPROVE | both |
| `txparam(param)` | TXPARAM | both |
| `framedataload(offset, frameIndex)` | FRAMEDATALOAD | both |
| `framedatacopy(dataOffset, length, frameIndex)` | FRAMEDATACOPY | both |
| `frameparam(frameIndex, param)` | FRAMEPARAM | both |
| `sigparam(signatureIndex, param)` | SIGPARAM | both |
| `sigdatacopy(dataOffset, length, signatureIndex)` | SIGDATACOPY | `ERC8421_WORKSHOP` (from the EIP text) |
| `txtrace(in2, param)` | TXTRACE | `EIP7906_WORKSHOP` |
| `eventdatacopy(eventIndex, dataOffset, length)` | EVENTDATACOPY | `EIP7906_WORKSHOP` |

- **Same operands as the opcode**, in the order of the EIP's stack table (top of the stack first), minus operands that
  only mean something inside the helper: the destination of a copy (the copy returns `bytes memory` instead) and
  the return range of `approve`. So `txtrace` takes `in2` first.
- **Named ids.** `TxParam`, `FrameParam`, `SigParam`, `TxTrace` and `Scope` are enums with the EIPs' names, and each
  member's number is its id (`uint256(TxParam.NONCE) == 1`). An id the EIP leaves unassigned is kept as an
  `UNASSIGNED_<hex>` member so the numbers stay true.
- **Inherit, don't call.** `APPROVE` acts on the account that executes it, so `HegotaSupport` has to be part of your
  contract. The constructor deploys one small Yul helper per opcode (with `CREATE`, so every contract owns its
  helpers) and keeps their addresses as immutables: no storage.
- **A missing opcode reverts** with `OpcodeUnsupported(devnet, opcode)`; a devnet that lacks a helper file lacks the
  opcode.
- Reads are `view` (the helper is `staticcall`ed); `approve` is `delegatecall`ed.

Where the Yul lives: `yul/<devnet>/<Opcode>.yul`, one file per opcode per devnet, each with a header saying where the
opcode byte came from and whether it was exercised on the devnet. `yarn build:helpers` compiles them (solc-js,
optimizer off, `paris`) into `contracts/generated/HelperCode.sol`, the only place Solidity can read the creation code
from. Nothing outside `yul/` contains an opcode byte.

Mapping to profiles: `ERC8421_WORKSHOP` is `ethrex-eip8141-tracer` (chain 1337) and `EIP7906_WORKSHOP` is
`ethrex-hegota-devnet` (chain 3151908).

### How much to trust a helper

- *Verified on the devnet*: `APPROVE` and `SIGPARAM` on `ERC8421_WORKSHOP` (a workshop uses them); `TXTRACE` and
  `EVENTDATACOPY` on `EIP7906_WORKSHOP` (the other workshop); and on `EIP7906_WORKSHOP` also `APPROVE`, `TXPARAM`,
  `FRAMEDATALOAD`, `FRAMEDATACOPY`, `FRAMEPARAM` and `SIGPARAM`, each run by a probe contract in a VERIFY frame under
  `ethrex_simulateFrameTransaction` on 2026-10-24, with the answers checked.
- *From the EIP text*: the rest (`TXPARAM`, `FRAMEDATALOAD`, `FRAMEDATACOPY`, `FRAMEPARAM`, `SIGDATACOPY` on
  `ERC8421_WORKSHOP`). They may differ from what the client implements.
- `SIGDATACOPY` is not on `EIP7906_WORKSHOP`: the devnet halts on `0xb5`, even for a zero-length copy of an `ARBITRARY`
  signature (which the devnet otherwise accepts, and `SIGPARAM` reads its length).
- Forge and Hardhat's simulated chains do not know these opcodes, so `yarn test:sol` checks the wiring (which
  helper each devnet gets, its code, the ids) and not the opcodes themselves. Those run only on a devnet.

## Profiles

| Id | Devnet | Status | Payload layout | Frame modes |
|---|---|---|---|---|
| `ethrex-eip8141-tracer` | public alt-mempool devnet, chain 1337 | current | fees as one nested list; 9 items | DEFAULT, VERIFY, SENDER |
| `ethrex-hegota-devnet` | EIP-7906 devnet, chain 3151908 | current | three fee items; 11 items | + POST_TX |

The two layouts differ on the wire, so the same transaction encodes differently under each. Decoding with the
wrong profile fails with a count mismatch instead of misreading.

## Where devnets already differ from the EIP text

- **8272 recent roots.** Both devnets carry a top-level `recent_root_references` payload field. The current EIP
  text has no such field: tuples travel in the data of a VERIFY frame sent to `RECENT_ROOT_ADDRESS`
  (`encodeRecentRootData` builds that data).
- **Predeploys.** The tracer devnet puts `NONCE_MANAGER` and `RECENT_ROOT_ADDRESS` at `0x...8250` and
  `0x...8272`; the EIP texts name other addresses. Predeploys live in the profile.
- **`TXPARAM 0x06`.** Not in the EIP text; ethrex answers it with the transaction's maximum cost.

## Adding, retiring and removing a profile

See [docs/adding-a-profile.md](docs/adding-a-profile.md). In short: `yarn new-profile <id> --from <other> --supersede`,
edit the new file, `yarn pin-vectors <id>`, `yarn verify`. The old profile stays, marked
`legacy`, and keeps producing the same bytes: its pinned test vectors fail if anything changes them.

## Not here yet

- Workshop-level transaction builders with their gas numbers (they stay in the workshops)
- `SIGDATACOPY` on `EIP7906_WORKSHOP` (the devnet halts on `0xb5`); `TXDIFF` (`0xb8`), whose stack layout is not recorded

## Development

```sh
yarn install
yarn verify        # typecheck, test, build, smoke-test the exports, check the generated HelperCode.sol, forge test
```

The Solidity tests need [Foundry](https://getfoundry.sh) (`forge test`, no libraries). The TypeScript tests run on Node's built-in runner after compiling with `tsc`. CI runs
`yarn verify` on Node 20, 22 and 24.
