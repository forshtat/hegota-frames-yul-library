// EVENTDATACOPY (0xb7), EIP-7906. Verified on the devnet. Only valid inside a POST_TX frame.
//
// calldata: eventIndex, dataOffset, length (three uint256)
// returns: the copied bytes (the copy lands at memory 0, so the opcode's destination operand is 0)
object "EventDataCopy" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            verbatim_4i_0o(hex"b7", calldataload(0), 0, calldataload(32), calldataload(64))
            return(0, calldataload(64))
        }
    }
}
