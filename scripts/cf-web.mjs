import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const mode = process.argv[2] ?? "build";
if (!["build", "preview", "deploy"].includes(mode)) {
  throw new Error(`Unsupported mode "${mode}". Expected: build | preview | deploy.`);
}

const extraArgs = process.argv.slice(3);
const repoRoot = resolve(import.meta.dirname, "..");
const webDir = join(repoRoot, "apps", "web");
const tmpDir = join(repoRoot, ".claude", "cf-tmp");
const cfPkgDir = realpathSync(join(webDir, "node_modules", "@opennextjs", "cloudflare"));
const cfCli = join(cfPkgDir, "dist", "cli", "index.js");

function runOpenNext(command, args = []) {
  const result = spawnSync(process.execPath, [cfCli, command, ...args], {
    cwd: webDir,
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: tmpDir,
      TMP: tmpDir,
      TMPDIR: tmpDir,
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * On Windows, Next.js standalone + OpenNext copy NTFS junctions with absolute targets pointing
 * back to the unpatched root `node_modules/.pnpm`. Repoint them to the patched copy inside
 * `.open-next/server-functions/default/node_modules` and re-bundle `worker.js`.
 */
async function fixWindowsStandaloneJunctions() {
  if (process.platform !== "win32") return;

  const defaultDir = join(webDir, ".open-next", "server-functions", "default");
  if (!existsSync(defaultDir)) return;

  const rootNmPrefix = join(repoRoot, "node_modules") + sep;
  const defaultNmPrefix = join(defaultDir, "node_modules") + sep;
  let repointed = 0;

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        const rawTarget = readlinkSync(fullPath);
        const normTarget = rawTarget.startsWith("\\\\?\\") ? rawTarget.slice(4) : rawTarget;
        if (normTarget.startsWith(rootNmPrefix)) {
          const newTarget = defaultNmPrefix + normTarget.slice(rootNmPrefix.length);
          unlinkSync(fullPath);
          symlinkSync(newTarget, fullPath, "junction");
          repointed += 1;
        }
      } else if (entry.isDirectory()) {
        walk(fullPath);
      }
    }
  }

  walk(defaultDir);
  if (repointed === 0) return;

  console.log(`Repointed ${repointed} Windows NTFS junctions in ${relative(webDir, defaultDir)}.`);
  const prevCwd = process.cwd();
  process.chdir(webDir);
  try {
    const utilsUrl = pathToFileURL(join(cfPkgDir, "dist", "cli", "commands", "utils", "utils.js")).href;
    const bundleUrl = pathToFileURL(join(cfPkgDir, "dist", "cli", "build", "bundle-server.js")).href;
    const { retrieveCompiledConfig, getNormalizedOptions, nextAppDir } = await import(utilsUrl);
    const { bundleServer } = await import(bundleUrl);
    const { config } = await retrieveCompiledConfig();
    const buildOpts = getNormalizedOptions(config);
    buildOpts.minify = false;
    await bundleServer(buildOpts, { minify: true, sourceDir: nextAppDir });
  } finally {
    process.chdir(prevCwd);
  }
}

mkdirSync(tmpDir, { recursive: true });
try {
  runOpenNext("build", mode === "build" ? extraArgs : []);
  await fixWindowsStandaloneJunctions();
  if (mode === "preview" || mode === "deploy") {
    runOpenNext(mode, extraArgs);
  }
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
