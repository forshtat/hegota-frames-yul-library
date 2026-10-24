import type { Hex } from "viem";
import { prebuiltBytecode } from "./generated/index.js";
import type { ContractName } from "./contracts.js";

/**
 * Creation bytecode of the library's Yul contracts, compiled ahead of time for every profile that can have them, so
 * a consumer needs no compiler. Regenerate with `yarn build:yul`.
 */
export function prebuilt(profileId: string, name: ContractName): Hex {
  const forProfile = prebuiltBytecode[profileId];
  if (!forProfile) throw new Error(`No prebuilt contracts for profile "${profileId}". Known: ${Object.keys(prebuiltBytecode).join(", ")}`);
  const code = forProfile[name];
  if (!code) throw new Error(`Profile "${profileId}" has no prebuilt "${name}" (it lacks an opcode it needs). Available: ${Object.keys(forProfile).join(", ") || "(none)"}`);
  return code;
}
