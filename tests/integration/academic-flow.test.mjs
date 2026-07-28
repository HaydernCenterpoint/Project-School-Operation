import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

const apiUrl = process.env.ACADEMIC_API_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY;
const missingEnvironment = !apiUrl || !supabaseUrl || !anonKey;

async function signIn(email) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: "Password123!" }),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 200, `sign-in failed for ${email}: ${JSON.stringify(body)}`);
  assert.equal(typeof body.access_token, "string");
  return body.access_token;
}

async function api(token, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  const mediaType = response.headers.get("content-type") ?? "";
  const body = mediaType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, body };
}

function expectStatus(result, status) {
  assert.equal(
    result.response.status,
    status,
    `${result.response.status} ${JSON.stringify(result.body)}`,
  );
}

test(
  "academic JWT/RLS BFF flow",
  {
    skip: missingEnvironment
      ? "Set ACADEMIC_API_URL, SUPABASE_URL, and SUPABASE_ANON_KEY to run."
      : false,
  },
  async () => {
    const [adminA, teacherA, studentA, teacherB, studentB] = await Promise.all([
      signIn("admin.a@saodo.test"),
      signIn("teacher.a@saodo.test"),
      signIn("student.a@saodo.test"),
      signIn("teacher.b@saodo.test"),
      signIn("student.b@saodo.test"),
    ]);

    const unauthenticatedLargeBody = await fetch(`${apiUrl}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(70_000) }),
    });
    assert.equal(unauthenticatedLargeBody.status, 401);

    const session = await api(adminA, "/api/classes");
    expectStatus(session, 200);
    assert.equal(session.body.role, "admin");
    const teacher = session.body.people.find(
      (person) => person.email === "teacher.a@saodo.test",
    );
    const student = session.body.people.find(
      (person) => person.email === "student.a@saodo.test",
    );
    assert.ok(teacher);
    assert.ok(student);

    const createdClass = await api(adminA, "/api/classes", {
      method: "POST",
      body: JSON.stringify({
        name: `Academic flow ${randomUUID()}`,
        teacherId: teacher.id,
        studentIds: [student.id],
      }),
    });
    expectStatus(createdClass, 201);
    const classId = createdClass.body.class.id;
    assert.match(classId, /^[0-9a-f-]{36}$/i);

    const rejectedDraft = await api(teacherA, "/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        classId,
        title: "Unpublishable draft",
        instructions: "Drafts are intentionally outside the alpha BFF.",
        status: "draft",
        dueAt: null,
      }),
    });
    expectStatus(rejectedDraft, 400);
    assert.equal(rejectedDraft.body.error.code, "invalid_body");

    const assignmentResult = await api(teacherA, "/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        classId,
        title: "Atomic academic flow",
        instructions: "Submit a concise response.",
        status: "published",
        dueAt: null,
      }),
    });
    expectStatus(assignmentResult, 201);
    const assignmentId = assignmentResult.body.assignment.id;

    const visibleAssignments = await api(
      studentA,
      `/api/assignments?classId=${classId}`,
    );
    expectStatus(visibleAssignments, 200);
    assert.ok(
      visibleAssignments.body.assignments.some(
        (assignment) => assignment.id === assignmentId,
      ),
    );

    const hiddenAssignments = await api(
      studentB,
      `/api/assignments?classId=${classId}`,
    );
    expectStatus(hiddenAssignments, 200);
    assert.deepEqual(hiddenAssignments.body.assignments, []);

    const idempotencyKey = randomUUID();
    const submissionInit = {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        assignmentId,
        content: "My submitted response.",
      }),
    };
    const submitted = await api(studentA, "/api/submissions", submissionInit);
    expectStatus(submitted, 201);
    const submissionId = submitted.body.submission.id;

    const replayed = await api(studentA, "/api/submissions", submissionInit);
    expectStatus(replayed, 200);
    assert.equal(replayed.body.submission.id, submissionId);
    assert.deepEqual(replayed.body.submission, submitted.body.submission);

    const changedReplay = await api(studentA, "/api/submissions", {
      ...submissionInit,
      body: JSON.stringify({ assignmentId, content: "Different content." }),
    });
    expectStatus(changedReplay, 409);

    const secondKey = await api(studentA, "/api/submissions", {
      ...submissionInit,
      headers: { "Idempotency-Key": randomUUID() },
    });
    expectStatus(secondKey, 409);

    for (const content of ["   ", "x".repeat(20_001)]) {
      const invalid = await api(studentA, "/api/submissions", {
        method: "POST",
        headers: { "Idempotency-Key": randomUUID() },
        body: JSON.stringify({ assignmentId, content }),
      });
      expectStatus(invalid, 400);
    }

    const oversizedBody = await api(studentA, "/api/submissions", {
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({ assignmentId, content: "x".repeat(70_000) }),
    });
    expectStatus(oversizedBody, 413);
    assert.equal(oversizedBody.body.error.code, "payload_too_large");

    const urlField = await api(studentA, "/api/submissions", {
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        assignmentId,
        content: "Text",
        url: "https://example.test/file",
      }),
    });
    expectStatus(urlField, 400);

    const multipart = await api(studentA, "/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=academic",
        "Idempotency-Key": randomUUID(),
      },
      body: "--academic--",
    });
    expectStatus(multipart, 415);

    const feedback = await api(
      teacherA,
      `/api/submissions/${submissionId}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({ feedback: "Clear and complete." }),
      },
    );
    expectStatus(feedback, 200);
    assert.equal(feedback.body.submission.status, "reviewed");
    assert.equal(feedback.body.submission.feedback, "Clear and complete.");

    const studentView = await api(
      studentA,
      `/api/submissions?assignmentId=${assignmentId}`,
    );
    expectStatus(studentView, 200);
    const reviewed = studentView.body.submissions.find(
      (submission) => submission.id === submissionId,
    );
    assert.equal(reviewed.feedback, "Clear and complete.");
    assert.equal(reviewed.status, "reviewed");

    const crossTenant = await api(studentB, "/api/submissions", {
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({ assignmentId, content: "Cross tenant attempt." }),
    });
    expectStatus(crossTenant, 404);

    const randomFeedback = await api(
      teacherA,
      `/api/submissions/${randomUUID()}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({ feedback: "Must remain hidden." }),
      },
    );
    expectStatus(randomFeedback, 404);
    assert.deepEqual(crossTenant.body.error, randomFeedback.body.error);

    const tenantBAssignment = await api(teacherB, "/api/assignments", {
      method: "POST",
      body: JSON.stringify({
        classId: "b1000000-0000-0000-0000-000000000001",
        title: `Tenant B rate limit ${randomUUID()}`,
        instructions: "Exercise the HTTP rate-limit mapping.",
        status: "published",
        dueAt: null,
      }),
    });
    expectStatus(tenantBAssignment, 201);

    const tenantBSubmission = await api(studentB, "/api/submissions", {
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        assignmentId: tenantBAssignment.body.assignment.id,
        content: "Tenant B rate-limit isolation submission.",
      }),
    });
    expectStatus(tenantBSubmission, 201);
    const tenantBSubmissionId = tenantBSubmission.body.submission.id;

    let rateLimited;
    let rateLimitAttempt = 0;
    for (let attempt = 1; attempt <= 61; attempt += 1) {
      const result = await api(
        teacherB,
        `/api/submissions/${tenantBSubmissionId}/feedback`,
        {
          method: "POST",
          body: JSON.stringify({ feedback: `Rate limit check ${attempt}` }),
        },
      );
      rateLimitAttempt = attempt;
      if (result.response.status === 429) {
        rateLimited = result;
        break;
      }
      expectStatus(result, 200);
    }

    assert.ok(rateLimited, "feedback writes must reach HTTP 429 within 61 attempts");
    assert.ok(rateLimitAttempt >= 1 && rateLimitAttempt <= 61);
    assert.equal(rateLimited.body.error.code, "rate_limited");
    assert.equal(rateLimited.response.headers.get("retry-after"), "60");
  },
);
