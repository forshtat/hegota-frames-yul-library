import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profiles } from "../src/profiles/registry.js";
import { compileYul, missingNames, prelude, yulSource } from "../src/yul/index.js";

const tracer = profiles["ethrex-eip8141-tracer"]!;
const hegota = profiles["ethrex-hegota-devnet"]!;

describe("prelude", () => {
  it("defines opcode wrappers with operands top of stack first, as verbatim of the right arity", () => {
    const p = prelude(tracer);
    assert.match(p, /function approve\(offset, length, scope\) \{ verbatim_3i_0o\(hex"aa", offset, length, scope\) \}/);
    assert.match(p, /function sigparam\(signatureIndex, param\) -> result \{ result := verbatim_2i_1o\(hex"b4", signatureIndex, param\) \}/);
    assert.match(p, /function txparam\(param\) -> result \{ result := verbatim_1i_1o\(hex"b0", param\) \}/);
    assert.match(p, /function framedatacopy\(memOffset, dataOffset, length, frameIndex\) \{ verbatim_4i_0o\(hex"b2"/);
  });

  it("defines named constants for parameters, modes, scopes and schemes", () => {
    const p = prelude(tracer);
    assert.match(p, /function SIGPARAM_RESOLVED_SIGNER\(\) -> v \{ v := 0x00 \}/);
    assert.match(p, /function TXPARAM_MAX_COST\(\) -> v \{ v := 0x06 \}/);
    assert.match(p, /function FRAME_MODE_VERIFY\(\) -> v \{ v := 0x01 \}/);
    assert.match(p, /function APPROVE_EXECUTION_AND_PAYMENT\(\) -> v \{ v := 0x03 \}/);
    assert.match(p, /function SIG_SCHEME_SECP256K1\(\) -> v \{ v := 0x01 \}/);
  });

  it("marks what is verified on the devnet and what only comes from the EIP text", () => {
    const p = prelude(tracer);
    assert.match(p, /approve\(offset, length, scope\)\s+opcode 0xaa, verified on the devnet/);
    assert.match(p, /txparam\(param\) -> word\s+opcode 0xb0, from the EIP text, not yet verified/);
  });

  it("only defines what the profile has", () => {
    const p = prelude(hegota);
    assert.match(p, /function txtrace\(in2, param\) -> result \{ result := verbatim_2i_1o\(hex"b6", in2, param\) \}/);
    assert.match(p, /function FRAME_MODE_POST_TX\(\) -> v \{ v := 0x03 \}/);
    assert.doesNotMatch(p, /function approve\(/);
    assert.doesNotMatch(p, /SIGPARAM_/);
  });

  it("the full source nests the body and the prelude in a runtime object", () => {
    const s = yulSource(tracer, "t", "stop()");
    assert.match(s, /^object "t" \{[\s\S]*object "runtime" \{[\s\S]*stop\(\)[\s\S]*function approve/);
  });
});

describe("missingNames / compileYul errors", () => {
  it("names the profile and the missing opcode, before solc is involved", () => {
    assert.deepEqual(missingNames(hegota, "approve(0, 0, 3)"), ["opcode approve()"]);
    assert.throws(() => compileYul(hegota, "x", "approve(0, 0, 3)"), /Profile "ethrex-hegota-devnet" does not define: opcode approve\(\)/);
  });

  it("names a constant the profile lacks", () => {
    assert.deepEqual(missingNames(tracer, "pop(TXPARAM_NOPE())"), ["TXPARAM_NOPE()"]);
    assert.deepEqual(missingNames(hegota, "pop(FRAME_MODE_VERIFY()) pop(FRAME_MODE_NOPE())"), ["FRAME_MODE_NOPE()"]);
  });

  it("is quiet about names the profile has", () => {
    assert.deepEqual(missingNames(tracer, "approve(0, 0, APPROVE_PAYMENT())"), []);
  });
});
