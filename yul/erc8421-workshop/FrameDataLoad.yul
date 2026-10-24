// FRAMEDATALOAD (0xb1), EIP-8141. From the EIP text, not yet exercised on the devnet.
//
// calldata: offset, frameIndex (two uint256)
object "FrameDataLoad" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            mstore(0, verbatim_2i_1o(hex"b1", calldataload(0), calldataload(32)))
            return(0, 32)
        }
    }
}
