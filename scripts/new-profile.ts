/**
 * Creates a profile by copying an existing one and registering it.
 *
 *   yarn new-profile <new-id> --from <existing-id> [--supersede]
 *
 * `--supersede` marks the existing profile `legacy` with `supersededBy`; it stays fully usable. Nothing is deleted:
 * a devnet that still runs the old rules keeps working with the old profile.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const newId = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--from");
const fromIndex = args.indexOf("--from");
const fromId = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
const supersede = args.includes("--supersede");

const usage = "usage: yarn new-profile <new-id> --from <existing-id> [--supersede]";
if (!newId || !fromId) throw new Error(usage);
if (!/^[a-z][a-z0-9-]*$/.test(newId)) throw new Error(`"${newId}" is not a valid id: lowercase letters, digits and dashes, starting with a letter`);

const profileFile = (id: string) => `${root}src/profiles/${id}.ts`;
if (!fs.existsSync(profileFile(fromId))) throw new Error(`No profile "${fromId}" in src/profiles/`);
if (fs.existsSync(profileFile(newId))) throw new Error(`Profile "${newId}" already exists`);

const camel = (id: string) => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

// 1. the profile file
let source = fs.readFileSync(profileFile(fromId), "utf8");
source = source.replace(`id: "${fromId}"`, `id: "${newId}"`).replace(/status: "legacy",\n\s*supersededBy: "[^"]*",/, 'status: "current",');
fs.writeFileSync(profileFile(newId), source);

// 2. the registry
const registryPath = `${root}src/profiles/registry.ts`;
let registry = fs.readFileSync(registryPath, "utf8");
registry = registry.replace("// </profiles:imports>", `import { profile as ${camel(newId)} } from "./${newId}.js";\n// </profiles:imports>`);
registry = registry.replace("  // </profiles:entries>", `  ${camel(newId)},\n  // </profiles:entries>`);
fs.writeFileSync(registryPath, registry);

// 3. optionally retire the old one
if (supersede) {
  const oldPath = profileFile(fromId);
  const old = fs.readFileSync(oldPath, "utf8").replace('status: "current",', `status: "legacy",\n  supersededBy: "${newId}",`);
  fs.writeFileSync(oldPath, old);
}

console.log(`created src/profiles/${newId}.ts from ${fromId} and registered it${supersede ? `; ${fromId} is now legacy` : ""}.
Next:
  1. edit src/profiles/${newId}.ts: devnet, eips, envelope, modes, opcodes, params, yul target
  2. yarn pin-vectors ${newId}   (writes test/vectors/${newId}.ts; review the diff against the client)
  3. yarn build:yul                  (writes src/yul/generated/ for the new profile)
  4. yarn verify`);
