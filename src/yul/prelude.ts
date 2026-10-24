import type { OpcodeName, ParamOpcode, Profile } from "../profiles/types.js";

/** The Yul function name for each opcode. Operands are always listed top of the stack first, as in the EIP tables. */
export const YUL_NAMES: Record<OpcodeName, string> = {
  approve: "approve",
  txParam: "txparam",
  frameDataLoad: "framedataload",
  frameDataCopy: "framedatacopy",
  frameParam: "frameparam",
  sigParam: "sigparam",
  sigDataCopy: "sigdatacopy",
  txTrace: "txtrace",
  eventDataCopy: "eventdatacopy",
};

const PARAM_PREFIX: Record<ParamOpcode, string> = {
  txParam: "TXPARAM",
  frameParam: "FRAMEPARAM",
  sigParam: "SIGPARAM",
  txTrace: "TXTRACE",
};

const hex = (n: number, digits = 2) => `0x${n.toString(16).padStart(digits, "0")}`;

function wrapper(name: OpcodeName, spec: NonNullable<Profile["opcodes"][OpcodeName]>): string {
  const fn = YUL_NAMES[name];
  const params = spec.stack.join(", ");
  const call = `verbatim_${spec.stack.length}i_${spec.outputs}o(hex"${spec.byte.toString(16).padStart(2, "0")}"${spec.stack.map((s) => `, ${s}`).join("")})`;
  const sig = spec.outputs === 1 ? `function ${fn}(${params}) -> result` : `function ${fn}(${params})`;
  const body = spec.outputs === 1 ? `result := ${call}` : call;
  return `  // ${fn}(${params})${spec.outputs === 1 ? " -> word" : ""}  opcode ${hex(spec.byte)}, ${spec.verified === "devnet" ? "verified on the devnet" : "from the EIP text, not yet verified on the devnet"}\n  ${sig} { ${body} }`;
}

function constants(prefix: string, table: Record<string, number>): string[] {
  return Object.entries(table).map(([name, value]) => `  function ${prefix}_${name}() -> v { v := ${hex(value)} }`);
}

/**
 * The Yul source that gives every opcode and constant of the profile a name. Paste it after your code in a
 * `code { ... }` block, or let `compileYul` do it. Everything the profile defines is included.
 *
 *  - opcodes: `approve(offset, length, scope)`, `sigparam(signatureIndex, param)`, ... Operands are listed top of
 *    the stack first, exactly as in the EIP's stack table.
 *  - parameter constants: `TXPARAM_NONCE()`, `FRAMEPARAM_MODE()`, `SIGPARAM_RESOLVED_SIGNER()`, `TXTRACE_...()`
 *  - `FRAME_MODE_<NAME>()`, `APPROVE_<SCOPE>()`, `SIG_SCHEME_<NAME>()`
 */
export function prelude(profile: Profile): string {
  const lines: string[] = [`  // Profile "${profile.id}"`];
  for (const name of Object.keys(YUL_NAMES) as OpcodeName[]) {
    const spec = profile.opcodes[name];
    if (spec) lines.push(wrapper(name, spec));
  }
  for (const op of Object.keys(PARAM_PREFIX) as ParamOpcode[]) {
    const table = profile.params[op];
    if (table) lines.push(...constants(PARAM_PREFIX[op], table));
  }
  lines.push(...constants("FRAME_MODE", profile.frameModes));
  lines.push(...constants("APPROVE", profile.approveScopes));
  lines.push(...constants("SIG_SCHEME", profile.sigSchemes));
  return lines.join("\n");
}

/** Names a program may call that this profile does not define, found in `body`. Used to explain a mistake early. */
export function missingNames(profile: Profile, body: string): string[] {
  const missing: string[] = [];
  for (const [name, fn] of Object.entries(YUL_NAMES) as [OpcodeName, string][]) {
    if (!profile.opcodes[name] && new RegExp(`\\b${fn}\\s*\\(`).test(body)) missing.push(`opcode ${fn}()`);
  }
  for (const op of Object.keys(PARAM_PREFIX) as ParamOpcode[]) {
    const table = profile.params[op] ?? {};
    const re = new RegExp(`\\b${PARAM_PREFIX[op]}_([A-Z0-9_]+)\\s*\\(`, "g");
    for (const m of body.matchAll(re)) {
      if (!(m[1]! in table)) missing.push(`${PARAM_PREFIX[op]}_${m[1]}()`);
    }
  }
  const groups: [string, Record<string, number>][] = [
    ["FRAME_MODE", profile.frameModes],
    ["APPROVE", profile.approveScopes],
    ["SIG_SCHEME", profile.sigSchemes],
  ];
  for (const [prefix, table] of groups) {
    for (const m of body.matchAll(new RegExp(`\\b${prefix}_([A-Z0-9_]+)\\s*\\(`, "g"))) {
      if (!(m[1]! in table)) missing.push(`${prefix}_${m[1]}()`);
    }
  }
  return [...new Set(missing)];
}
