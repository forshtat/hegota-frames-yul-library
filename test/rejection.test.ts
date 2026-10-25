import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainRejection } from "../src/rpc/index.js";

describe("explainRejection", () => {
  it("maps storage rejections from both nodes to STO", () => {
    assert.equal(explainRejection("unstaked payer accessed 0x6129d8bf6befced4bd2a300e0a57ec1ab73d690d slot 0x00").rule, "STO");
    assert.equal(explainRejection("Invalid params: validation-prefix simulation failed: StorageReadNonSender").rule, "STO");
  });

  it("maps banned opcodes from both nodes to OP-011", () => {
    assert.equal(explainRejection("payer uses banned opcode: TIMESTAMP").rule, "OP-011");
    assert.equal(explainRejection("simulation failed: BannedOpcode(66)").rule, "OP-011");
  });

  it("keeps the message and says UNKNOWN for anything else", () => {
    assert.deepEqual(explainRejection("something new"), { rule: "UNKNOWN", message: "something new" });
  });
});
