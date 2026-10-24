/**
 * Installing from git (`github:forshtat/hegota-frames-yul-library#...`) gives the sources without `dist/`, and yarn does
 * not run `prepare` for git dependencies. Build it here, only when it is missing: a published tarball ships `dist/`.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!fs.existsSync(`${root}dist`) && fs.existsSync(`${root}tsconfig.build.json`)) {
  const tsc = `${root}node_modules/typescript/bin/tsc`;
  if (!fs.existsSync(tsc)) {
    console.error("hegota-frames: dist/ is missing and typescript is not installed here, so it cannot be built");
    process.exit(1);
  }
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root, stdio: "inherit" });
}
