// TXTRACE (0xb6), EIP-7906. Verified on the devnet. Only valid inside a POST_TX frame.
//
// calldata: in2, param (two uint256); in2 is the opcode's top stack operand
object "TxTrace" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            mstore(0, verbatim_2i_1o(hex"b6", calldataload(0), calldataload(32)))
            return(0, 32)
        }
    }
}
