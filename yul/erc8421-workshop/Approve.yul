// APPROVE (0xaa), EIP-8141. Verified on the devnet.
//
// Run by delegatecall from the account being approved: APPROVE acts on the executing account, and ends the frame
// the way RETURN does, so the offset and length of its return data are both 0.
//
// calldata: scope (uint256)
object "Approve" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return(0, datasize("runtime"))
    }
    object "runtime" {
        code {
            verbatim_3i_0o(hex"aa", 0, 0, calldataload(0))
        }
    }
}
