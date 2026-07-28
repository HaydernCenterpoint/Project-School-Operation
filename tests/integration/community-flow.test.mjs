import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

const apiUrl = process.env.ACADEMIC_API_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY;
const missingEnvironment = !apiUrl || !supabaseUrl || !anonKey;

function textNonce() {
  return randomUUID()
    .replaceAll("-", "")
    .replace(/\d/g, (digit) => String.fromCharCode(103 + Number(digit)));
}

async function signIn(email) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    },
  );
  const body = await response.json();
  assert.equal(
    response.status,
    200,
    `sign-in failed for ${email}: ${JSON.stringify(body)}`,
  );
  return body.access_token;
}

async function api(token, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (
    init.method === "POST" &&
    (/\/community\/spaces\/[^/]+\/messages$/.test(path) ||
      /\/community\/moderation\/reports\/[^/]+\/actions$/.test(path)) &&
    !headers.has("Idempotency-Key")
  ) {
    headers.set("Idempotency-Key", randomUUID());
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  const body = response.headers.get("content-type")?.includes("application/json")
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
  "community JWT/RLS BFF flow",
  {
    skip: missingEnvironment
      ? "Set ACADEMIC_API_URL, SUPABASE_URL, and SUPABASE_ANON_KEY to run."
      : false,
  },
  async () => {
    const [moderatorA, teacherA, studentA, studentB] = await Promise.all([
      signIn("moderator.a@saodo.test"),
      signIn("teacher.a@saodo.test"),
      signIn("student.a@saodo.test"),
      signIn("student.b@saodo.test"),
    ]);

    const [studentSpacesResult, teacherSpacesResult] = await Promise.all([
      api(studentA, "/api/community/spaces"),
      api(teacherA, "/api/community/spaces"),
    ]);
    expectStatus(studentSpacesResult, 200);
    expectStatus(teacherSpacesResult, 200);
    const studentSpaces = studentSpacesResult.body.spaces;
    const teacherSpaces = teacherSpacesResult.body.spaces;
    const teacherSpaceIds = new Set(teacherSpaces.map((space) => space.id));
    const schoolSpace = studentSpaces.find(
      (space) => space.kind === "school" && teacherSpaceIds.has(space.id),
    );
    const sharedSpace = studentSpaces.find(
      (space) => space.kind === "class" && teacherSpaceIds.has(space.id),
    );
    const privateClub = studentSpaces.find(
      (space) => space.kind === "club" && !teacherSpaceIds.has(space.id),
    );
    assert.ok(schoolSpace, "student and teacher need a shared school space");
    assert.ok(sharedSpace, "student and teacher need a shared class space");
    assert.ok(privateClub, "student seed needs a club the teacher cannot access");
    assert.equal(schoolSpace.canPost, false);
    assert.equal(Number.isInteger(schoolSpace.slowModeSeconds), true);
    assert.equal(
      teacherSpaces.find((space) => space.id === schoolSpace.id).canPost,
      true,
    );

    const studentSchoolPost = await api(
      studentA,
      `/api/community/spaces/${schoolSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "Students cannot publish school announcements.",
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(studentSchoolPost, 404);
    const teacherSchoolPost = await api(
      teacherA,
      `/api/community/spaces/${schoolSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: `Teacher school announcement ${textNonce()}`,
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(teacherSchoolPost, 201);

    const missingMessageKey = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        headers: { "Idempotency-Key": "" },
        body: JSON.stringify({
          text: "Message without a valid idempotency key",
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(missingMessageKey, 400);
    assert.equal(missingMessageKey.body.error.code, "invalid_idempotency_key");

    const deniedPrivacy = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "My bank account number is 1234567890",
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(deniedPrivacy, 422);
    assert.equal(
      deniedPrivacy.body.error.code,
      "privacy_confirmation_required",
    );
    const deniedEmailPrivacy = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "Contact teacher@example.test",
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(deniedEmailPrivacy, 422);
    assert.equal(
      deniedEmailPrivacy.body.error.code,
      "privacy_confirmation_required",
    );
    const deniedVietnamesePrivacy = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "Gặp tại 12 đường Sao Đỏ, phường Sao Đỏ",
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(deniedVietnamesePrivacy, 422);
    assert.equal(
      deniedVietnamesePrivacy.body.error.code,
      "privacy_confirmation_required",
    );
    const confirmedPrivacy = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "My bank account number is 1234567890",
          replyToId: null,
          privacyWarningConfirmed: true,
        }),
      },
    );
    expectStatus(confirmedPrivacy, 201);

    const tooManyMentions = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "@one @two @three @four @five @six",
          replyToId: null,
          privacyWarningConfirmed: false,
        }),
      },
    );
    expectStatus(tooManyMentions, 400);

    const attachmentField = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: "No attachment support",
          replyToId: null,
          privacyWarningConfirmed: false,
          attachmentUrl: "https://example.test/file",
        }),
      },
    );
    expectStatus(attachmentField, 400);

    const multipart = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=community" },
        body: "--community--",
      },
    );
    expectStatus(multipart, 415);

    const teacherMessageKey = randomUUID();
    const teacherMessageBody = {
      text: `Teacher message ${textNonce()}`,
      replyToId: null,
      privacyWarningConfirmed: false,
    };
    const teacherMessage = await api(
      teacherA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        headers: { "Idempotency-Key": teacherMessageKey },
        body: JSON.stringify(teacherMessageBody),
      },
    );
    expectStatus(teacherMessage, 201);
    const teacherMessageRetry = await api(
      teacherA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        headers: { "Idempotency-Key": teacherMessageKey },
        body: JSON.stringify(teacherMessageBody),
      },
    );
    expectStatus(teacherMessageRetry, 201);
    assert.equal(
      teacherMessageRetry.body.message.id,
      teacherMessage.body.message.id,
    );
    const teacherMessageConflict = await api(
      teacherA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        headers: { "Idempotency-Key": teacherMessageKey },
        body: JSON.stringify({
          ...teacherMessageBody,
          text: `Conflicting retry ${textNonce()}`,
        }),
      },
    );
    expectStatus(teacherMessageConflict, 409);

    const reply = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          text: `Student reply ${textNonce()}`,
          replyToId: teacherMessage.body.message.id,
          privacyWarningConfirmed: true,
        }),
      },
    );
    expectStatus(reply, 201);
    assert.equal(
      reply.body.message.replyTo.id,
      teacherMessage.body.message.id,
    );

    const messages = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
    );
    expectStatus(messages, 200);
    const createdIndex = messages.body.messages.findIndex(
      (message) => message.id === teacherMessage.body.message.id,
    );
    const replyIndex = messages.body.messages.findIndex(
      (message) => message.id === reply.body.message.id,
    );
    assert.ok(createdIndex >= 0 && replyIndex > createdIndex);
    assert.equal(
      messages.body.messages[createdIndex].author.displayName,
      "Teacher A",
    );

    const reaction = await api(
      studentA,
      `/api/community/messages/${teacherMessage.body.message.id}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ active: true, reaction: "like" }),
      },
    );
    expectStatus(reaction, 200);
    assert.equal(reaction.body.active, true);
    const reactionRetry = await api(
      studentA,
      `/api/community/messages/${teacherMessage.body.message.id}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ active: true, reaction: "like" }),
      },
    );
    expectStatus(reactionRetry, 200);
    assert.equal(reactionRetry.body.active, true);

    const block = await api(
      studentA,
      `/api/community/users/${teacherMessage.body.message.author.id}/block`,
      { method: "POST", body: JSON.stringify({ active: true }) },
    );
    expectStatus(block, 200);
    assert.equal(block.body.active, true);
    const blockRetry = await api(
      studentA,
      `/api/community/users/${teacherMessage.body.message.author.id}/block`,
      { method: "POST", body: JSON.stringify({ active: true }) },
    );
    expectStatus(blockRetry, 200);
    assert.equal(blockRetry.body.active, true);
    const messagesWhileBlocked = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
    );
    expectStatus(messagesWhileBlocked, 200);
    const blockedMessage = messagesWhileBlocked.body.messages.find(
      (message) => message.id === teacherMessage.body.message.id,
    );
    assert.equal(blockedMessage.author.blockedByMe, true);
    assert.equal(blockedMessage.text, "");
    const unblock = await api(
      studentA,
      `/api/community/users/${teacherMessage.body.message.author.id}/block`,
      { method: "POST", body: JSON.stringify({ active: false }) },
    );
    expectStatus(unblock, 200);
    assert.equal(unblock.body.active, false);

    const mute = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/mute`,
      { method: "POST", body: JSON.stringify({ active: true }) },
    );
    expectStatus(mute, 200);
    assert.equal(mute.body.active, true);
    const muteRetry = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/mute`,
      { method: "POST", body: JSON.stringify({ active: true }) },
    );
    expectStatus(muteRetry, 200);
    assert.equal(muteRetry.body.active, true);
    const messagesWhileMuted = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
    );
    expectStatus(messagesWhileMuted, 200);
    assert.ok(
      messagesWhileMuted.body.messages.some(
        (message) => message.id === teacherMessage.body.message.id,
      ),
      "mute must not hide messages",
    );

    const crossTenant = await api(
      studentB,
      `/api/community/spaces/${sharedSpace.id}/messages`,
    );
    const nonMember = await api(
      teacherA,
      `/api/community/spaces/${privateClub.id}/messages`,
    );
    expectStatus(crossTenant, 404);
    expectStatus(nonMember, 404);
    assert.deepEqual(crossTenant.body.error, nonMember.body.error);

    const report = await api(
      studentA,
      `/api/community/messages/${teacherMessage.body.message.id}/reports`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: "harassment",
          detail: "Integration moderation evidence.",
        }),
      },
    );
    expectStatus(report, 201);
    assert.match(report.body.reportId, /^[0-9a-f-]{36}$/i);
    const reportRetry = await api(
      studentA,
      `/api/community/messages/${teacherMessage.body.message.id}/reports`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: "harassment",
          detail: "Retry must return the existing active report.",
        }),
      },
    );
    expectStatus(reportRetry, 201);
    assert.equal(reportRetry.body.reportId, report.body.reportId);
    const ordinaryMessagesAfterReport = await api(
      teacherA,
      `/api/community/spaces/${sharedSpace.id}/messages`,
    );
    expectStatus(ordinaryMessagesAfterReport, 200);
    assert.equal(
      ordinaryMessagesAfterReport.body.messages.find(
        (message) => message.id === teacherMessage.body.message.id,
      ).report.count,
      0,
    );

    const moderatorSession = await api(moderatorA, "/api/classes");
    expectStatus(moderatorSession, 200);
    assert.deepEqual(moderatorSession.body.classes, []);
    assert.deepEqual(moderatorSession.body.people, []);
    const academicDenied = await api(
      moderatorA,
      `/api/assignments?classId=${sharedSpace.classId}`,
    );
    expectStatus(academicDenied, 403);
    const queue = await api(moderatorA, "/api/community/moderation");
    expectStatus(queue, 200);
    const queued = queue.body.reports.find(
      (item) => item.id === report.body.reportId,
    );
    assert.ok(queued);
    assert.equal(queued.reason, "harassment");
    assert.equal(queued.detail, "Integration moderation evidence.");

    const studentSlowMode = await api(
      studentA,
      `/api/community/spaces/${sharedSpace.id}/slow-mode`,
      { method: "POST", body: JSON.stringify({ seconds: 10 }) },
    );
    expectStatus(studentSlowMode, 403);
    const moderatorSlowMode = await api(
      moderatorA,
      `/api/community/spaces/${sharedSpace.id}/slow-mode`,
      { method: "POST", body: JSON.stringify({ seconds: 1 }) },
    );
    expectStatus(moderatorSlowMode, 200);
    assert.equal(moderatorSlowMode.body.slowModeSeconds, 1);
    const slowModeReset = await api(
      moderatorA,
      `/api/community/spaces/${sharedSpace.id}/slow-mode`,
      { method: "POST", body: JSON.stringify({ seconds: 0 }) },
    );
    expectStatus(slowModeReset, 200);

    const missingModerationKey = await api(
      moderatorA,
      `/api/community/moderation/reports/${report.body.reportId}/actions`,
      {
        method: "POST",
        headers: { "Idempotency-Key": "" },
        body: JSON.stringify({
          action: "escalate",
          note: "Missing idempotency key.",
        }),
      },
    );
    expectStatus(missingModerationKey, 400);
    assert.equal(
      missingModerationKey.body.error.code,
      "invalid_idempotency_key",
    );

    const moderationKey = randomUUID();
    const moderated = await api(
      moderatorA,
      `/api/community/moderation/reports/${report.body.reportId}/actions`,
      {
        method: "POST",
        headers: { "Idempotency-Key": moderationKey },
        body: JSON.stringify({
          action: "escalate",
          note: "Escalated by integration test.",
        }),
      },
    );
    expectStatus(moderated, 200);
    assert.equal(moderated.body.action, "escalate");
    const moderationRetry = await api(
      moderatorA,
      `/api/community/moderation/reports/${report.body.reportId}/actions`,
      {
        method: "POST",
        headers: { "Idempotency-Key": moderationKey },
        body: JSON.stringify({
          action: "escalate",
          note: "Escalated by integration test.",
        }),
      },
    );
    expectStatus(moderationRetry, 200);
    assert.equal(moderationRetry.body.actionId, moderated.body.actionId);
    const moderationConflict = await api(
      moderatorA,
      `/api/community/moderation/reports/${report.body.reportId}/actions`,
      {
        method: "POST",
        headers: { "Idempotency-Key": moderationKey },
        body: JSON.stringify({
          action: "resolve",
          note: "Conflicting replay.",
        }),
      },
    );
    expectStatus(moderationConflict, 409);

    let rateLimited;
    for (let attempt = 1; attempt <= 11; attempt += 1) {
      const result = await api(
        moderatorA,
        `/api/community/spaces/${sharedSpace.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            text: `Rate limit message attempt ${attempt}`,
            replyToId: null,
            privacyWarningConfirmed: false,
          }),
        },
      );
      if (result.response.status === 429) {
        rateLimited = result;
        break;
      }
      expectStatus(result, 201);
    }
    assert.ok(rateLimited, "message writes must reach HTTP 429");
    assert.equal(rateLimited.body.error.code, "rate_limited");
    assert.equal(rateLimited.response.headers.get("retry-after"), "60");

    const leave = await api(
      studentA,
      `/api/community/spaces/${privateClub.id}/leave`,
      { method: "POST", body: "{}" },
    );
    expectStatus(leave, 204);
    const leftClub = await api(
      studentA,
      `/api/community/spaces/${privateClub.id}/messages`,
    );
    expectStatus(leftClub, 404);
  },
);
