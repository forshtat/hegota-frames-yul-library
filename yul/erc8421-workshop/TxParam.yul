// TXPARAM (0xb0), EIP-8141 and EIP-8250. From the EIP text, not yet exercised on the devnet.
//
// calldata: param (uint256)
object "TxParam" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            mstore(0, verbatim_1i_1o(hex"b0", calldataload(0)))
            return(0, 32)
        }
    }
}
