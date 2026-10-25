import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { Abi, Hex } from "viem";

export interface CompiledContract {
  abi: Abi;
  /** Creation bytecode. */
  bytecode: Hex;
}

export interface CompileOptions {
  /** Default `cancun`. The helpers HegotaSupport deploys are fixed at `paris` whatever this is. */
  evmVersion?: "paris" | "shanghai" | "cancun";
  /** Default off, which keeps the output readable. */
  optimizer?: boolean;
}

type Solc = { compile(input: string, callbacks?: { import: (p: string) => { contents: string } | { error: string } }): string };

function loadSolc(): Solc {
  try {
    return createRequire(import.meta.url)("solc");
  } catch {
    throw new Error('compileSolidity needs the "solc" package (solc-js), an optional peer dependency: yarn add solc@0.8.28');
  }
}

/** The package directory: `contracts/` and `yul/` live next to `package.json`, whether this runs from `dist/` or `build/src/`. */
function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!fs.existsSync(path.join(dir, "contracts", "HegotaSupport.sol"))) {
    const up = path.dirname(dir);
    if (up === dir) throw new Error("@forshtat/hegota-support: cannot find its contracts/ directory");
    dir = up;
  }
  return dir;
}

/**
 * Compiles one Solidity source with solc-js, so no toolchain is needed. `import "@forshtat/hegota-support/contracts/..."` resolves
 * to the contracts this package ships. Any other import is an error: pass a self-contained source.
 *
 * Compile with solc 0.8.28; HegotaSupport pins `pragma solidity 0.8.28`.
 */
export function compileSolidity(name: string, source: string, options: CompileOptions = {}): CompiledContract {
  const root = packageRoot();
  const prefix = "@forshtat/hegota-support/";
  const findImports = (importPath: string) => {
    if (!importPath.startsWith(prefix)) return { error: `cannot import "${importPath}": only "${prefix}contracts/..." resolves` };
    const file = path.join(root, importPath.slice(prefix.length));
    return fs.existsSync(file) ? { contents: fs.readFileSync(file, "utf8") } : { error: `no such file in @forshtat/hegota-support: ${importPath}` };
  };
  const out = JSON.parse(
    loadSolc().compile(
      JSON.stringify({
        language: "Solidity",
        sources: { [`${name}.sol`]: { content: source } },
        settings: {
          evmVersion: options.evmVersion ?? "cancun",
          optimizer: { enabled: options.optimizer ?? false, runs: 200 },
          outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
        },
      }),
      { import: findImports },
    ),
  ) as {
    errors?: { severity: string; formattedMessage: string }[];
    contracts?: Record<string, Record<string, { abi: Abi; evm: { bytecode: { object: string } } }>>;
  };
  const errors = (out.errors ?? []).filter((e) => e.severity === "error");
  if (errors.length > 0) throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  const contract = out.contracts?.[`${name}.sol`]?.[name];
  if (!contract) throw new Error(`${name}.sol defines no contract named "${name}"`);
  return { abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` };
}
