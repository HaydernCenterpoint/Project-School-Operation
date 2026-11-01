import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.ALLOW_LOCAL_DB_UPGRADE_SMOKE !== "1") {
  throw new Error(
    "Refusing to reset a database. Set ALLOW_LOCAL_DB_UPGRADE_SMOKE=1 for the disposable local Supabase database.",
  );
}

const root = resolve(import.meta.dirname, "..");
const config = readFileSync(join(root, "supabase/config.toml"), "utf8");
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"$/m)?.[1];
if (!projectId) throw new Error("Unable to resolve the local Supabase project ID.");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
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

function databaseContainer() {
  const ids = run("docker", [
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
  if (ids.length !== 1) {
    throw new Error("Expected exactly one matching local Supabase database.");
  }
  return ids[0];
}

function sql(container, statement) {
  return run("docker", [
    "exec",
    container,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-Atqc",
    statement,
  ]);
}

let upgraded = false;
try {
  runPnpm([
    "exec",
    "supabase",
    "db",
    "reset",
    "--version",
    "202607280002",
  ]);
  const container = databaseContainer();
  sql(
    container,
    `
      insert into public.submissions (
        id,
        tenant_id,
        assignment_id,
        student_id,
        content,
        idempotency_key,
        status,
        feedback,
        feedback_at,
        feedback_by
      )
      values (
        'a3000000-0000-0000-0000-000000000099',
        'a0000000-0000-0000-0000-000000000001',
        'a2000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000003',
        'Legacy reviewed submission',
        'a4000000-0000-4000-8000-000000000099',
        'reviewed',
        null,
        now(),
        '10000000-0000-0000-0000-000000000002'
      );
    `,
  );

  runPnpm(["exec", "supabase", "migration", "up", "--local"]);
  const normalized = sql(
    container,
    `
      select concat_ws(
        '|',
        status::text,
        (feedback is null)::text,
        (feedback_at is null)::text,
        (feedback_by is null)::text
      )
      from public.submissions
      where id = 'a3000000-0000-0000-0000-000000000099';
    `,
  );
  if (normalized !== "submitted|true|true|true") {
    throw new Error(`Legacy submission was not normalized: ${normalized}`);
  }

  runPnpm(["db:lint"]);
  runPnpm(["db:reset"]);
  runPnpm(["db:test"]);
  runPnpm(["db:lint"]);
  upgraded = true;
  process.stdout.write(
    "Populated migration upgrade 002→current passed; legacy blank review normalized to submitted.\n",
  );
} finally {
  if (!upgraded) {
    runPnpm(["db:reset"]);
  }
}
