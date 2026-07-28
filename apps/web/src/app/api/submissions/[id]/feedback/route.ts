import {
  apiError,
  databaseError,
  getAcademicContext,
  hasExactKeys,
  isUuid,
  json,
  mapAcademicRpcError,
  mapSubmission,
  readJsonObject,
  singleRpcRow,
} from "@/lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");

  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["feedback"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const feedback =
    typeof body.value.feedback === "string" ? body.value.feedback.trim() : "";
  if (feedback.length < 1 || feedback.length > 5_000) {
    return apiError(400, "invalid_body", "Feedback must be 1–5000 characters.");
  }

  const { data, error } = await auth.context.supabase.rpc("review_submission", {
    p_submission_id: id,
    p_feedback: feedback,
  });
  if (error) return mapAcademicRpcError(error);

  let row = singleRpcRow(data);
  if (isUuid(data)) {
    const result = await auth.context.supabase
      .from("submissions")
      .select(
        "id,tenant_id,assignment_id,student_id,content,idempotency_key,status,submitted_at,feedback,feedback_at,feedback_by",
      )
      .eq("id", data)
      .maybeSingle();
    if (result.error) return databaseError("Unable to load reviewed submission.");
    row = result.data;
  }
  if (!row) return databaseError("Feedback update returned no record.");
  const personResult = await auth.context.supabase
    .from("memberships")
    .select("display_name")
    .eq("user_id", String(row.student_id))
    .maybeSingle();
  if (personResult.error) {
    return databaseError("Unable to load submission student.");
  }
  return json({
    submission: mapSubmission(row, personResult.data?.display_name),
  });
}
