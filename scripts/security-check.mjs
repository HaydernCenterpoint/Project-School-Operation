import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const generatedRoots = [
  "apps/web/.next",
  "apps/mobile/dist",
  ...process.argv.slice(2),
];
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".expo",
  ".temp",
  "dist",
  "node_modules",
]);
const textExtensions = new Set([
  "",
  ".css",
  ".gradle",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".lock",
  ".md",
  ".mjs",
  ".properties",
  ".ps1",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
];
const exposurePatterns = [
  [
    "public AI credential",
    /\b(?:NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]*(?:AI|LLM|MODEL|PROVIDER)[A-Z0-9_]*(?:KEY|SECRET|TOKEN)\b/,
  ],
];
const sourcePatterns = [
  ["service-role identifier", /\b(?:SUPABASE_)?SERVICE[_-]?ROLE(?:_KEY)?\b/i],
  [
    "public client secret",
    /\b(?:NEXT_PUBLIC|EXPO_PUBLIC)_[A-Z0-9_]*(?:SECRET|PRIVATE|OPENAI|ANTHROPIC|SERVICE_ROLE)\b/,
  ],
  ["application console logging", /\bconsole\.(?:debug|error|info|log|warn)\s*\(/],
  [
    "assigned high-entropy credential",
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password)\b\s*[:=]\s*["'][A-Za-z0-9_+./=-]{16,}["']/i,
  ],
];
const mobilePatterns = [
  ["mobile demo core path", /\b(?:isDemo|demoAssignments|demoSubmissions|demoClasses)\b/],
];
const runtimeBinaryExtensions = new Set([".hbc"]);

function filesUnder(path, generated = false) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) return [];
  if (statSync(absolute).isFile()) return [{ absolute, generated }];

  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name) && !generated) {
      return [];
    }
    if (
      !generated &&
      entry.isFile() &&
      /^\.env(?:\.|$)/.test(entry.name) &&
      entry.name !== ".env.example"
    ) {
      return [];
    }
    return filesUnder(join(absolute, entry.name), generated);
  });
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout) return [];
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .map((path) => ({ absolute: resolve(root, path), generated: false }));
}

function serviceRoleJwt(content) {
  for (const match of content.matchAll(
    /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}\b/g,
  )) {
    try {
      const payload = JSON.parse(
        Buffer.from(match[0].split(".")[1], "base64url").toString("utf8"),
      );
      if (payload?.role === "service_role") return true;
    } catch {
      // A malformed JWT-like value is handled by the regular pattern scan.
    }
  }
  return false;
}

const tracked = trackedFiles();
const repositoryFiles = tracked.length ? tracked : filesUnder(".");
const generatedFiles = generatedRoots.flatMap((path) => filesUnder(path, true));
const candidates = new Map();
for (const file of [...repositoryFiles, ...generatedFiles]) {
  candidates.set(file.absolute, file);
}

const findings = [];
let scannedBytes = 0;
let skippedBinaryFiles = 0;
let scannedRuntimeBinaryFiles = 0;

for (const { absolute, generated } of candidates.values()) {
  if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
  const extension = extname(absolute).toLowerCase();
  const path = relative(root, absolute);
  const runtimeBinary =
    runtimeBinaryExtensions.has(extension) ||
    (generated &&
      /^apps[\\/]mobile(?:[\\/]|$)/.test(path) &&
      (extension === ".bundle" ||
        /(?:^|[\\/])_expo[\\/]static[\\/]js(?:[\\/]|$)/.test(path)));
  if (!textExtensions.has(extension) && !runtimeBinary) {
    skippedBinaryFiles += 1;
    continue;
  }

  const bytes = readFileSync(absolute);
  const content = runtimeBinary ? bytes.toString("latin1") : bytes.toString("utf8");
  scannedBytes += bytes.length;
  if (runtimeBinary) scannedRuntimeBinaryFiles += 1;
  const policySource =
    !generated &&
    /^(?:apps|packages|supabase|\.github)(?:[\\/]|$)/.test(path);
  const patterns = [
    ...secretPatterns,
    ...exposurePatterns,
    ...(policySource ? sourcePatterns : []),
    ...(!generated && /^apps[\\/]mobile(?:[\\/]|$)/.test(path)
      ? mobilePatterns
      : []),
  ];

  for (const [name, pattern] of patterns) {
    if (pattern.test(content)) findings.push(`${path}: ${name}`);
  }
  if (serviceRoleJwt(content)) {
    findings.push(`${path}: Supabase service-role JWT`);
  }
}

if (findings.length) {
  process.stderr.write(`Security check failed:\n${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Security check passed (${candidates.size - skippedBinaryFiles - scannedRuntimeBinaryFiles} text files, ${scannedRuntimeBinaryFiles} runtime binaries scanned, ${scannedBytes} bytes, ${skippedBinaryFiles} binary files explicitly skipped; repository mode: ${tracked.length ? "tracked files" : "workspace fallback"}).\n`,
  );
}
