// SIGPARAM (0xb4), EIP-8141. Verified on the devnet.
//
// calldata: signatureIndex, param (two uint256)
object "SigParam" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            mstore(0, verbatim_2i_1o(hex"b4", calldataload(0), calldataload(32)))
            return(0, 32)
        }
    }
}
