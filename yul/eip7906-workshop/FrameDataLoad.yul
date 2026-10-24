// FRAMEDATALOAD (0xb1), EIP-8141. Verified on the devnet: a probe contract ran it in a VERIFY frame under ethrex_simulateFrameTransaction (2026-10-24) and got the expected answers.
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
