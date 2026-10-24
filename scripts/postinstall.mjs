/**
 * Installing from git (`github:forshtat/hegota-frames-yul-library#...`) gives the sources without `dist/`, and yarn does
 * not run `prepare` for git dependencies. Build it here, only when it is missing: a published tarball ships `dist/`.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!fs.existsSync(`${root}dist`) && fs.existsSync(`${root}tsconfig.build.json`)) {
  // yarn does not install a git dependency's devDependencies, so use the typescript the consumer already has
  let tsc;
  try {
    tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  } catch {
    console.error('hegota-frames: dist/ is missing and no "typescript" is installed to build it; add typescript to your devDependencies');
    process.exit(1);
  }
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root, stdio: "inherit" });
}
