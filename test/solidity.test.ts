import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileSolidity } from "../src/solidity/index.js";

const paymaster = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {HegotaSupport} from "@forshtat/hegota-support/contracts/HegotaSupport.sol";
import {Devnet} from "@forshtat/hegota-support/contracts/Devnet.sol";
import {Scope} from "@forshtat/hegota-support/contracts/Params.sol";
contract P is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
  fallback() external { approve(Scope.PAYMENT); }
}`;

describe("compileSolidity", () => {
  it("resolves @forshtat/hegota-support/contracts imports", () => {
    const { bytecode } = compileSolidity("P", paymaster);
    assert.match(bytecode, /^0x[0-9a-f]+$/);
  });

  it("refuses other imports by name", () => {
    assert.throws(() => compileSolidity("Q", 'import "./Nope.sol"; contract Q {}'), /only "@forshtat\/hegota-support\/contracts/);
  });

  it("names a contract that is missing", () => {
    assert.throws(() => compileSolidity("Z", "contract Y {}"), /no contract named "Z"/);
  });
});
