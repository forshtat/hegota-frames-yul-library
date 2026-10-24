import { createRequire } from "node:module";
import type { Hex } from "viem";
import type { Profile } from "../profiles/types.js";
import { missingNames, prelude } from "./prelude.js";

export interface CompiledYul {
  /** Creation bytecode: deploying it creates a contract whose code is `body` with the prelude. */
  bytecode: Hex;
  /** The full Yul source that was compiled, for reading or debugging. */
  source: string;
}

function loadSolc(): { compile(input: string): string } {
  try {
    return createRequire(import.meta.url)("solc");
  } catch {
    throw new Error(
      'compileYul needs the "solc" package (solc-js), which is an optional peer dependency: yarn add solc@0.8.28. ' +
        'To avoid compiling at all, use the prebuilt contracts from "hegota-frames/yul/prebuilt".',
    );
  }
}

/** The complete Yul object for a runtime `body`, with the profile's prelude appended. */
export function yulSource(profile: Profile, name: string, body: string): string {
  return `object "${name}" {
  code { datacopy(0, dataoffset("runtime"), datasize("runtime")) return(0, datasize("runtime")) }
  object "runtime" {
    code {
${body}
${prelude(profile)}
    }
  }
}`;
}

/**
 * Compiles a Yul runtime `body` for a profile. The body can call everything `prelude(profile)` defines. Using
 * something the profile does not have (for example `approve()` on a devnet that has no APPROVE) fails here with the
 * profile and the missing name, instead of as an undeclared identifier inside solc.
 *
 * The optimizer is off: the opcodes are `verbatim`, and the code is meant to be read.
 */
export function compileYul(profile: Profile, name: string, body: string): CompiledYul {
  const missing = missingNames(profile, body);
  if (missing.length > 0) {
    throw new Error(`Profile "${profile.id}" does not define: ${missing.join(", ")}`);
  }
  const source = yulSource(profile, name, body);
  const solc = loadSolc();
  const out = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Yul",
        sources: { [`${name}.yul`]: { content: source } },
        settings: {
          evmVersion: profile.yul.evmVersion,
          optimizer: { enabled: false },
          outputSelection: { "*": { "*": ["evm.bytecode.object"] } },
        },
      }),
    ),
  ) as { errors?: { severity: string; formattedMessage: string }[]; contracts?: Record<string, Record<string, { evm: { bytecode: { object: string } } }>> };
  const errors = (out.errors ?? []).filter((e) => e.severity === "error");
  if (errors.length > 0) throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  const file = Object.values(out.contracts ?? {})[0];
  const contract = file?.[name] ?? Object.values(file ?? {})[0];
  if (!contract) throw new Error("solc returned no contract");
  return { bytecode: `0x${contract.evm.bytecode.object}`, source };
}
