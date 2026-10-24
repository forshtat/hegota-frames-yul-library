import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profiles } from "../src/profiles/registry.js";
import { compileYul, contracts, disassemble, hasOpcode, isAvailable } from "../src/yul/index.js";
import { prebuilt } from "../src/yul/prebuilt.js";

const tracer = profiles["ethrex-eip8141-tracer"]!;
const hegota = profiles["ethrex-hegota-devnet"]!;
const PUSH0 = 0x5f;

describe("shipped Yul contracts", () => {
  it("are available exactly where the profile has the opcodes they need", () => {
    assert.equal(isAvailable(tracer, contracts.approver), true);
    assert.equal(isAvailable(tracer, contracts.signerReader), true);
    assert.equal(isAvailable(hegota, contracts.approver), false);
    assert.equal(isAvailable(hegota, contracts.signerReader), false);
  });

  it("the approver compiles to bytecode that executes APPROVE (0xaa), and avoids PUSH0 on a paris target", () => {
    const { bytecode } = compileYul(tracer, "approver", contracts.approver.body);
    assert.ok(hasOpcode(bytecode, 0xaa));
    assert.equal(hasOpcode(bytecode, PUSH0), false);
  });

  it("the signer reader executes SIGPARAM (0xb4) and returns one word", () => {
    const { bytecode } = compileYul(tracer, "signerReader", contracts.signerReader.body);
    assert.ok(hasOpcode(bytecode, 0xb4));
    assert.ok(hasOpcode(bytecode, 0xf3)); // RETURN
  });

  it("a TXTRACE assertion compiles on the 7906 profile and uses 0xb6", () => {
    const { bytecode } = compileYul(hegota, "probe", "pop(txtrace(0, TXTRACE_EVENTS_COUNT()))\neventdatacopy(0, 0, 0, 0)");
    assert.ok(hasOpcode(bytecode, 0xb6));
    assert.ok(hasOpcode(bytecode, 0xb7));
  });

  it("the committed prebuilt bytecode is what the compiler produces today", () => {
    for (const p of Object.values(profiles)) {
      for (const c of Object.values(contracts)) {
        if (!isAvailable(p, c)) continue;
        assert.equal(prebuilt(p.id, c.name), compileYul(p, c.name, c.body).bytecode, `${p.id}/${c.name}: run yarn build:yul`);
      }
    }
  });

  it("prebuilt() explains what is missing", () => {
    assert.throws(() => prebuilt("nope", "approver"), /No prebuilt contracts for profile "nope"/);
    assert.throws(() => prebuilt("ethrex-hegota-devnet", "approver"), /ethrex-hegota-devnet.*approver|no prebuilt|No prebuilt/);
  });

  it("disassemble skips PUSH data", () => {
    const ins = disassemble("0x60aa00");
    assert.deepEqual(ins.map((i) => i.opcode), [0x60, 0x00]);
  });
});
