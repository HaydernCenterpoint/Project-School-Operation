import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.ALLOW_LOCAL_DB_RESTORE_SMOKE !== "1") {
  throw new Error(
    "Refusing to mutate a database. Set ALLOW_LOCAL_DB_RESTORE_SMOKE=1 for the disposable local Supabase database.",
  );
}

const root = resolve(import.meta.dirname, "..");
const config = readFileSync(join(root, "supabase/config.toml"), "utf8");
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"$/m)?.[1];
if (!projectId) throw new Error("Unable to resolve the local Supabase project ID.");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
  return result.stdout.trim();
}

function runPnpm(args) {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error("Run this smoke through pnpm.");
  if (cli.toLowerCase().endsWith(".exe")) {
    return run(cli, args);
  }
  return run(process.execPath, [cli, ...args]);
}

const containerIds = run("docker", [
  "ps",
  "--filter",
  `label=com.supabase.cli.project=${projectId}`,
  "--filter",
  `name=supabase_db_${projectId}`,
  "--format",
  "{{.ID}}",
])
  .split(/\r?\n/)
  .filter(Boolean);
if (containerIds.length !== 1) {
  throw new Error("Expected exactly one matching local Supabase database.");
}
const containerId = containerIds[0];

function sql(statement, input) {
  return run(
    "docker",
    [
      "exec",
      ...(input ? ["-i"] : []),
      containerId,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      ...(input ? [] : ["-Atqc", statement]),
    ],
    input ? { input } : undefined,
  );
}

const marker = sql(`
  select count(*)
  from public.tenants
  where id in (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001'
  );
`);
if (marker !== "2") {
  throw new Error("Restore smoke only supports the seeded local sandbox.");
}

const fingerprintSql = `
  select json_build_object(
    'tenants', (select count(*) from public.tenants),
    'memberships', (select count(*) from public.memberships),
    'classes', (select count(*) from public.classes),
    'class_members', (select count(*) from public.class_members),
    'assignments', (select count(*) from public.assignments),
    'submissions', (select count(*) from public.submissions),
    'audit_logs', (select count(*) from public.audit_logs)
  )::text;
`;
const before = sql(fingerprintSql);
const temporaryDirectory = mkdtempSync(join(tmpdir(), "saodo-backup-"));
const backupPath = join(temporaryDirectory, "public-data.sql");
let truncated = false;

try {
  runPnpm([
    "exec",
    "supabase",
    "db",
    "dump",
    "--local",
    "--data-only",
    "--schema",
    "public",
    "--use-copy",
    "--file",
    backupPath,
  ]);
  if (statSync(backupPath).size < 100) {
    throw new Error("Local backup is unexpectedly empty.");
  }

  const backup = readFileSync(backupPath, "utf8");
  if (!backup.includes('COPY "public"."tenants"')) {
    throw new Error("Local backup does not contain the tenant table.");
  }

  sql(`
    do $$
    declare
      stmt text;
    begin
      select 'truncate table ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' restart identity cascade'
      into stmt
      from pg_tables
      where schemaname = 'public';
      if stmt is not null then
        execute stmt;
      end if;
    end;
    $$;
    truncate table private.academic_rate_limits;
  `);
  truncated = true;
  sql("", `SET session_replication_role = replica;\n${backup}`);

  const after = sql(fingerprintSql);
  if (after !== before) {
    throw new Error(`Restore fingerprint mismatch: ${before} != ${after}`);
  }
  process.stdout.write(`Backup/restore smoke passed: ${after}\n`);
} catch (error) {
  if (truncated) {
    try {
      sql("", readFileSync(backupPath, "utf8"));
    } catch {
      // Preserve the original failure; this database is a disposable local sandbox.
    }
  }
  throw error;
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
