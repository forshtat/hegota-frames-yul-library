/**
 * Writes `test/vectors/<id>.ts`: the library's current encoding of the sample transactions, pinned so that any later
 * change to the profile or the codec shows up as a test failure. Run it once when a profile is created, review the
 * output against the client (or an independent implementation), and commit it. After a devnet depends on a profile,
 * never re-pin: add a new profile instead.
 *
 *   yarn pin-vectors <profile-id>
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getProfile } from "../src/profiles/registry.js";
import { encodeTx, sigHash, txHash } from "../src/tx/index.js";
import { samples } from "../test/samples.js";

const id = process.argv[2];
if (!id) throw new Error("usage: yarn pin-vectors <profile-id>");
const profile = getProfile(id);

const rows = (await samples(profile)).map(
  ({ name, tx }) =>
    `  {\n    name: ${JSON.stringify(name)},\n    raw: "${encodeTx(profile, tx)}",\n    sigHash: "${sigHash(profile, tx)}",\n    txHash: "${txHash(profile, tx)}",\n  },`,
);
const out = fileURLToPath(new URL(`../../test/vectors/${id}.ts`, import.meta.url));
fs.writeFileSync(out, `// PINNED by \`yarn pin-vectors ${id}\`. Do not regenerate once a devnet depends on this profile.\nexport const vectors = [\n${rows.join("\n")}\n] as const;\n`);
console.log(`pinned ${rows.length} vectors to test/vectors/${id}.ts`);
