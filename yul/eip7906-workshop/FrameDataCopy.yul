// FRAMEDATACOPY (0xb2), EIP-8141. Verified on the devnet: a probe contract ran it in a VERIFY frame under ethrex_simulateFrameTransaction (2026-10-24) and got the expected answers.
//
// calldata: dataOffset, length, frameIndex (three uint256)
// returns: the copied bytes (the copy lands at memory 0, so the opcode's destination operand is 0)
object "FrameDataCopy" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            verbatim_4i_0o(hex"b2", 0, calldataload(0), calldataload(32), calldataload(64))
            return(0, calldataload(32))
        }
    }
}
