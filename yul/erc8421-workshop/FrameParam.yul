// FRAMEPARAM (0xb3), EIP-8141. From the EIP text, not yet exercised on the devnet.
//
// calldata: frameIndex, param (two uint256)
object "FrameParam" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            mstore(0, verbatim_2i_1o(hex"b3", calldataload(0), calldataload(32)))
            return(0, 32)
        }
    }
}
