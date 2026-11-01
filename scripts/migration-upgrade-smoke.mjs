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
    "--no-seed",
  ]);
  const container = databaseContainer();
  sql(
    container,
    `
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      )
      values
        ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'teacher.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Teacher A"}', now(), now(), '', '', '', ''),
        ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'student.a@saodo.test', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Student A"}', now(), now(), '', '', '', '');

      insert into public.tenants (id, name)
      values ('a0000000-0000-0000-0000-000000000001', 'Sao Do Campus A');

      insert into public.memberships (
        tenant_id, user_id, role, display_name, email
      )
      values
        ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'teacher', 'Teacher A', 'teacher.a@saodo.test'),
        ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'student', 'Student A', 'student.a@saodo.test');

      insert into public.classes (id, tenant_id, teacher_id, name)
      values (
        'a1000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        'AI Foundations A'
      );

      insert into public.class_members (tenant_id, class_id, student_id)
      values (
        'a0000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000003'
      );

      insert into public.assignments (
        id, tenant_id, class_id, created_by, title, instructions, status, due_at
      )
      values (
        'a2000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        'Academic Alpha A',
        'Legacy upgrade fixture.',
        'published',
        now() + interval '7 days'
      );

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
  const communityUpgrade = sql(
    container,
    `
      select concat_ws(
        '|',
        ('moderator' = any(enum_range(null::public.member_role)::text[]))::text,
        (to_regclass('public.community_spaces') is not null)::text,
        (to_regclass('public.content_reports') is not null)::text,
        (to_regprocedure('public.list_community_spaces()') is not null)::text,
        (
          select count(*) = 1
          from public.community_spaces
          where tenant_id = 'a0000000-0000-0000-0000-000000000001'
            and kind = 'school'
        )::text,
        (
          select count(*) = 1
          from public.community_spaces
          where tenant_id = 'a0000000-0000-0000-0000-000000000001'
            and class_id = 'a1000000-0000-0000-0000-000000000001'
            and kind = 'class'
        )::text
      );
    `,
  );
  if (communityUpgrade !== "true|true|true|true|true|true") {
    throw new Error(`Community migrations were not applied: ${communityUpgrade}`);
  }
  const aiGatewayUpgrade = sql(
    container,
    `
      select concat_ws(
        '|',
        (to_regclass('public.ai_tenant_policies') is not null)::text,
        (to_regclass('public.ai_consents') is not null)::text,
        (to_regclass('public.knowledge_documents') is not null)::text,
        (to_regclass('public.knowledge_chunks') is not null)::text,
        (to_regclass('public.ai_usage_events') is not null)::text,
        (
          to_regprocedure(
            'public.set_ai_tutor_consent(boolean,text)'
          ) is not null
        )::text,
        (
          to_regprocedure(
            'public.ingest_knowledge_document(uuid,uuid,text,text,text,text,jsonb,uuid)'
          ) is not null
        )::text,
        (
          to_regprocedure(
            'public.retrieve_tutor_chunks(uuid,text,integer)'
          ) is not null
        )::text,
        (
          to_regprocedure(
            'public.reserve_ai_tutor_request(uuid,uuid,integer)'
          ) is not null
        )::text,
        (
          to_regprocedure(
            'public.finish_ai_tutor_request(uuid,text,integer,integer,integer,text,text,integer)'
          ) is not null
        )::text,
        (
          select concat_ws(
            ',',
            count(*)::text,
            count(*) filter (where status <> 'started')::text
          )
          from public.ai_usage_events
        )
      );
    `,
  );
  if (aiGatewayUpgrade !== "true|true|true|true|true|true|true|true|true|true|0,0") {
    throw new Error(`AI gateway migration fingerprint failed: ${aiGatewayUpgrade}`);
  }

  runPnpm(["db:lint"]);
  runPnpm(["db:reset"]);
  runPnpm(["db:test"]);
  runPnpm(["db:lint"]);
  upgraded = true;
  process.stdout.write(
    "Populated migration upgrade 002 to current passed; academic, community, and AI gateway fingerprints verified.\n",
  );
} finally {
  if (!upgraded) {
    runPnpm(["db:reset"]);
  }
}
