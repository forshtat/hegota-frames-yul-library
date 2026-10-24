import type { OpcodeName, Profile } from "../profiles/types.js";

/**
 * A small contract written against the profile's Yul API. Solidity cannot emit the frame opcodes, so contracts that
 * need one (a wallet that approves, a reader of the resolved signer) call these helpers, usually by `delegatecall`
 * (the helper then runs in the caller's context, which `APPROVE` requires) or `staticcall`.
 */
export interface YulContract {
  name: string;
  description: string;
  /** Opcodes the profile must define for this contract to exist on it. */
  requires: readonly OpcodeName[];
  /** Parameter constants the profile must define, e.g. `["sigParam", "RESOLVED_SIGNER"]`. */
  requiresParams?: readonly (readonly [string, string])[];
  /** The runtime body, in Yul. */
  body: string;
}

export const contracts = {
  approver: {
    name: "approver",
    description:
      "Calls APPROVE with the scope read from the first calldata word. delegatecall it from a wallet or paymaster's VERIFY-frame code: APPROVE acts on the executing account, and ends the frame.",
    requires: ["approve"],
    body: "approve(0, 0, calldataload(0))",
  },
  signerReader: {
    name: "signerReader",
    description: "Returns the resolved signer of signature entry 0 as one word. staticcall it from VERIFY-frame code to learn who signed.",
    requires: ["sigParam"],
    requiresParams: [["sigParam", "RESOLVED_SIGNER"]],
    body: "mstore(0, sigparam(0, SIGPARAM_RESOLVED_SIGNER()))\nreturn(0, 32)",
  },
} as const satisfies Record<string, YulContract>;

export type ContractName = keyof typeof contracts;

/** Whether the profile defines everything the contract needs. */
export function isAvailable(profile: Profile, contract: YulContract): boolean {
  if (!contract.requires.every((op) => profile.opcodes[op])) return false;
  return (contract.requiresParams ?? []).every(([op, name]) => {
    const table = profile.params[op as keyof Profile["params"]];
    return table !== undefined && name in table;
  });
}
