// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// The contract of the README, compiled here so the README cannot drift from the API.
import {HegotaSupport} from "../../contracts/HegotaSupport.sol";
import {Devnet} from "../../contracts/Devnet.sol";
import {Scope, SigParam} from "../../contracts/Params.sol";

contract VasiliyPaymaster is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address public immutable OWNER = msg.sender;

    fallback() external {
        require(address(uint160(sigparam(0, SigParam.RESOLVED_SIGNER))) == OWNER, "bad signer");
        approve(Scope.PAYMENT);
    }
}
