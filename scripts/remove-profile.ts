/**
 * Removes a profile: its file, its pinned vectors and its registry entry.
 *
 *   yarn remove-profile <id>
 *
 * Think twice: removing a profile means nobody can use that devnet's rules through this library again. Marking it
 * `legacy` (`yarn new-profile <new-id> --from <id> --supersede`) keeps it usable and is almost always better.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const id = process.argv[2];
if (!id) throw new Error("usage: yarn remove-profile <id>");

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const file = `${root}src/profiles/${id}.ts`;
if (!fs.existsSync(file)) throw new Error(`No profile "${id}" in src/profiles/`);

for (const other of fs.readdirSync(`${root}src/profiles`)) {
  if (other === `${id}.ts`) continue;
  if (fs.readFileSync(`${root}src/profiles/${other}`, "utf8").includes(`supersededBy: "${id}"`)) {
    throw new Error(`${other} is superseded by "${id}": point it elsewhere (or remove it first)`);
  }
}

const registryPath = `${root}src/profiles/registry.ts`;
const registry = fs
  .readFileSync(registryPath, "utf8")
  .split("\n")
  .filter((line) => !line.includes(`./${id}.js`) && line.trim() !== `${camel(id)},`)
  .join("\n");
fs.writeFileSync(registryPath, registry);
fs.rmSync(file);
fs.rmSync(`${root}test/vectors/${id}.ts`, { force: true });
console.log(`removed profile "${id}". Now run: yarn verify`);
