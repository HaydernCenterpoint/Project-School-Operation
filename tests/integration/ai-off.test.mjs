import assert from "node:assert/strict";
import test from "node:test";
import {
  api,
  chunkA,
  classA,
  expectStatus,
  missingAcademicEnvironment,
  signIn,
  tutor,
  usage,
} from "./ai-test-support.mjs";

test(
  "AI disabled leaves academics available and creates no AI usage",
  {
    skip: missingAcademicEnvironment
      ? "Set API and Supabase environment to run."
      : false,
  },
  async () => {
    const student = await signIn("student.a@saodo.test");

    const consent = await api(student, "/api/ai/consent");
    expectStatus(consent, 200);
    assert.equal(consent.body.tutorEnabled, false);

    const result = await tutor(student, classA, "solar panel inspection");
    expectStatus(result, 503);
    assert.equal(result.body.error.code, "ai_unavailable");
    const citation = await api(
      student,
      `/api/ai/citations/${chunkA}?classId=${classA}`,
    );
    expectStatus(citation, 503);
    assert.equal(citation.body.error.code, "ai_unavailable");
    assert.deepEqual(await usage(student, [result.requestId]), []);
  },
);
