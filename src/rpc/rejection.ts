export interface Rejection {
  /** `OP-011` banned opcode, `STO` storage access, `UNKNOWN` for anything else. */
  rule: "OP-011" | "STO" | "UNKNOWN";
  /** The node's text, unchanged. */
  message: string;
}

/** Maps a node's rejection text (the sidecar or ethrex) to a rule family of the mempool rules. */
export function explainRejection(message: string): Rejection {
  if (/banned opcode|BannedOpcode/i.test(message)) return { rule: "OP-011", message };
  if (/StorageReadNonSender|accessed 0x[0-9a-f]+ slot/i.test(message)) return { rule: "STO", message };
  return { rule: "UNKNOWN", message };
}
