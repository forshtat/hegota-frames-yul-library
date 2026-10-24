/**
 * The registry of profiles. Adding or removing a profile touches exactly this file plus the profile's own file
 * (and its pinned vectors): see docs/adding-a-profile.md, or run `yarn new-profile`.
 *
 * `scripts/new-profile.ts` edits the two marked regions; keep the markers.
 */
import type { Profile } from "./types.js";
// <profiles:imports>
import { profile as ethrexEip8141Tracer } from "./ethrex-eip8141-tracer.js";
import { profile as ethrexHegotaDevnet } from "./ethrex-hegota-devnet.js";
// </profiles:imports>

const list: readonly Profile[] = [
  // <profiles:entries>
  ethrexEip8141Tracer,
  ethrexHegotaDevnet,
  // </profiles:entries>
];

export const profiles: Readonly<Record<string, Profile>> = Object.freeze(
  Object.fromEntries(list.map((p) => [p.id, p])),
);

export type ProfileId = string;

/** Looks a profile up by id and throws, listing the known ids, when there is none. */
export function getProfile(id: string): Profile {
  const found = profiles[id];
  if (!found) throw new Error(`Unknown profile "${id}". Known profiles: ${Object.keys(profiles).join(", ")}`);
  return found;
}
