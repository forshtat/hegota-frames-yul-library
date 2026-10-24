// SIGDATACOPY (0xb5), EIP-8141. From the EIP text, not yet exercised on the devnet.
//
// calldata: dataOffset, length, signatureIndex (three uint256)
// returns: the copied bytes (the copy lands at memory 0, so the opcode's destination operand is 0)
object "SigDataCopy" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            verbatim_4i_0o(hex"b5", 0, calldataload(0), calldataload(32), calldataload(64))
            return(0, calldataload(32))
        }
    }
}
