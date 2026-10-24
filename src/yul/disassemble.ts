import type { Hex } from "viem";

export interface Instruction {
  offset: number;
  opcode: number;
  /** PUSH immediate, when there is one. */
  data?: Hex;
}

/** Walks the bytecode instruction by instruction, so PUSH data is not mistaken for opcodes. */
export function disassemble(bytecode: Hex): Instruction[] {
  const bytes = Buffer.from(bytecode.slice(2), "hex");
  const out: Instruction[] = [];
  for (let i = 0; i < bytes.length; ) {
    const opcode = bytes[i]!;
    const size = opcode >= 0x60 && opcode <= 0x7f ? opcode - 0x5f : 0;
    out.push({ offset: i, opcode, ...(size ? { data: `0x${bytes.subarray(i + 1, i + 1 + size).toString("hex")}` as Hex } : {}) });
    i += 1 + size;
  }
  return out;
}

export const hasOpcode = (bytecode: Hex, opcode: number): boolean => disassemble(bytecode).some((i) => i.opcode === opcode);
