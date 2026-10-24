// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HegotaSupport} from "../../contracts/HegotaSupport.sol";
import {Devnet} from "../../contracts/Devnet.sol";
import {Opcode} from "../../contracts/Opcode.sol";
import {Scope, TxParam, FrameParam, SigParam, TxTrace} from "../../contracts/Params.sol";

/// Exposes the internal API, so a test can call it from outside.
contract Harness is HegotaSupport {
    constructor(Devnet devnet) HegotaSupport(devnet) {}

    function callApprove(Scope scope) external { approve(scope); }
    function callTxparam(TxParam param) external view returns (uint256) { return txparam(param); }
    function callFramedataload(uint256 offset, uint256 frameIndex) external view returns (bytes32) { return framedataload(offset, frameIndex); }
    function callFramedatacopy(uint256 dataOffset, uint256 length, uint256 frameIndex) external view returns (bytes memory) { return framedatacopy(dataOffset, length, frameIndex); }
    function callFrameparam(uint256 frameIndex, FrameParam param) external view returns (uint256) { return frameparam(frameIndex, param); }
    function callSigparam(uint256 signatureIndex, SigParam param) external view returns (uint256) { return sigparam(signatureIndex, param); }
    function callSigdatacopy(uint256 dataOffset, uint256 length, uint256 signatureIndex) external view returns (bytes memory) { return sigdatacopy(dataOffset, length, signatureIndex); }
    function callTxtrace(uint256 in2, TxTrace param) external view returns (uint256) { return txtrace(in2, param); }
    function callEventdatacopy(uint256 eventIndex, uint256 dataOffset, uint256 length) external view returns (bytes memory) { return eventdatacopy(eventIndex, dataOffset, length); }
}

/// A plain EVM does not know the frame opcodes, so what can be checked here is the wiring: which devnet gets which
/// helper, what each helper's code is, and that the ids are the EIPs' numbers. The opcodes themselves run only on a
/// devnet.
contract HegotaSupportTest {
    // ---------------------------------------------------------------------------------------- which helpers ------

    function test_erc8421_has_the_eip8141_opcodes_and_not_the_eip7906_ones() external {
        Harness h = new Harness(Devnet.ERC8421_WORKSHOP);
        _expectUnsupported(address(h), abi.encodeCall(Harness.callTxtrace, (0, TxTrace.GAS_PAYER)), Devnet.ERC8421_WORKSHOP, Opcode.TxTrace);
        _expectUnsupported(address(h), abi.encodeCall(Harness.callEventdatacopy, (0, 0, 0)), Devnet.ERC8421_WORKSHOP, Opcode.EventDataCopy);
        // the 8141 opcodes are present: a plain EVM fails at the unknown opcode, which is not OpcodeUnsupported
        _expectOtherFailure(address(h), abi.encodeCall(Harness.callTxparam, (TxParam.NONCE)));
        _expectOtherFailure(address(h), abi.encodeCall(Harness.callSigparam, (0, SigParam.RESOLVED_SIGNER)));
    }

    function test_eip7906_has_both_families_except_sigdatacopy() external {
        Harness h = new Harness(Devnet.EIP7906_WORKSHOP);
        // ethrex hegota-devnet halts on 0xb5, so it has no SIGDATACOPY helper
        _expectUnsupported(address(h), abi.encodeCall(Harness.callSigdatacopy, (0, 1, 0)), Devnet.EIP7906_WORKSHOP, Opcode.SigDataCopy);
        _expectOtherFailure(address(h), abi.encodeCall(Harness.callTxparam, (TxParam.NONCE)));
        _expectOtherFailure(address(h), abi.encodeCall(Harness.callSigparam, (0, SigParam.SCHEME)));
        _expectOtherFailure(address(h), abi.encodeCall(Harness.callTxtrace, (0, TxTrace.GAS_PAYER)));
        _expectOtherFailure(address(h), abi.encodeCall(Harness.callEventdatacopy, (0, 0, 32)));
    }

    // ------------------------------------------------------------------------------------------ helper code ------

    /// Equivalent to the hand-written approver the workshop ran on the devnet, 0x60003560006000aa
    /// (push 0, calldataload, push 0, push 0, APPROVE): DUP1 stands in for the second PUSH1 0.
    function test_the_approve_helper_is_the_devnet_verified_approver() external {
        Harness h = new Harness(Devnet.ERC8421_WORKSHOP);
        bytes memory runtime = _runtimeOfCreated(address(h), 0);
        require(keccak256(runtime) == keccak256(hex"600035600080aa"), "approve helper changed");
    }

    function test_every_helper_executes_its_opcode_byte() external {
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.Approve, 0xaa);
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.TxParam, 0xb0);
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.FrameDataLoad, 0xb1);
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.FrameDataCopy, 0xb2);
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.FrameParam, 0xb3);
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.SigParam, 0xb4);
        _checkByte(Devnet.ERC8421_WORKSHOP, Opcode.SigDataCopy, 0xb5);
        _checkByte(Devnet.EIP7906_WORKSHOP, Opcode.Approve, 0xaa);
        _checkByte(Devnet.EIP7906_WORKSHOP, Opcode.SigParam, 0xb4);
        _checkByte(Devnet.EIP7906_WORKSHOP, Opcode.TxTrace, 0xb6);
        _checkByte(Devnet.EIP7906_WORKSHOP, Opcode.EventDataCopy, 0xb7);
    }

    // ------------------------------------------------------------------------------------------------ ids -------

    function test_enum_members_are_the_ids_of_the_eips() external pure {
        require(uint256(Scope.EXECUTION_AND_PAYMENT) == 0x3, "Scope");
        require(uint256(TxParam.NONCE) == 0x01 && uint256(TxParam.MAX_COST) == 0x06 && uint256(TxParam.NONCE_KEY_0) == 0x10, "TxParam");
        require(uint256(type(TxParam).max) == 0x10, "TxParam max");
        require(uint256(FrameParam.MODE) == 0x02 && uint256(FrameParam.STATE_GAS_USED) == 0x0b, "FrameParam");
        require(uint256(SigParam.RESOLVED_SIGNER) == 0x00 && uint256(SigParam.SIGNATURE_LENGTH) == 0x03, "SigParam");
        require(uint256(TxTrace.SLOT_AFTER) == 0x09 && uint256(TxTrace.EVENTS_COUNT) == 0x0c, "TxTrace");
        require(uint256(TxTrace.EVENT_DATA_LENGTH) == 0x13 && uint256(TxTrace.GAS_PAYER) == 0x15, "TxTrace tail");
    }

    // -------------------------------------------------------------------------------------------- utilities -----

    /// Code of the `n`-th contract the harness created, found by replaying its CREATE addresses (nonce 1, 2, ...).
    function _runtimeOfCreated(address creator, uint256 n) private view returns (bytes memory) {
        return created(creator, n + 1).code;
    }

    function created(address creator, uint256 nonce) private pure returns (address) {
        // RLP of [creator, nonce] for nonce 1..127
        // forge-lint: disable-next-line(unsafe-typecast)
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), creator, bytes1(uint8(nonce)))))));
    }

    function _checkByte(Devnet devnet, Opcode opcode, uint8 expected) private {
        Harness h = new Harness(devnet);
        // helpers are created in constructor order: nonce 1 is the first one the devnet has
        address helper = _helperFor(address(h), devnet, opcode);
        bytes memory code = helper.code;
        bool found;
        for (uint256 i; i < code.length; ++i) if (uint8(code[i]) == expected) found = true;
        require(found, "helper does not execute its opcode");
    }

    /// The helper of `opcode`: the k-th created contract, where k counts the opcodes the devnet has before it.
    function _helperFor(address harness, Devnet devnet, Opcode opcode) private pure returns (address) {
        uint256 nonce;
        for (uint256 i; i <= uint256(opcode); ++i) {
            if (_has(devnet, Opcode(i))) ++nonce;
        }
        return created(harness, nonce);
    }

    function _has(Devnet devnet, Opcode opcode) private pure returns (bool) {
        if (devnet == Devnet.ERC8421_WORKSHOP) return uint256(opcode) <= uint256(Opcode.SigDataCopy);
        return opcode != Opcode.SigDataCopy;
    }

    function _expectUnsupported(address target, bytes memory data, Devnet devnet, Opcode opcode) private {
        (bool ok, bytes memory ret) = target.call(data);
        require(!ok, "should have reverted");
        require(keccak256(ret) == keccak256(abi.encodeWithSelector(HegotaSupport.OpcodeUnsupported.selector, devnet, opcode)), "wrong error");
    }

    function _expectOtherFailure(address target, bytes memory data) private {
        (bool ok, bytes memory ret) = target.call(data);
        require(!ok, "an opcode a plain EVM does not know cannot succeed");
        // forge-lint: disable-next-line(unsafe-typecast)
        require(ret.length < 4 || bytes4(ret) != HegotaSupport.OpcodeUnsupported.selector, "reported unsupported");
    }
}
