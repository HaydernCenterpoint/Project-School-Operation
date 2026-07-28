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

function optionalAssignmentId(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => key !== "assignmentId")) return null;
  const values = params.getAll("assignmentId");
  if (values.length === 0) return undefined;
  return values.length === 1 && isUuid(values[0]) ? values[0] : null;
}

export async function GET(request: Request) {
  const assignmentId = optionalAssignmentId(request);
  if (assignmentId === null) {
    return apiError(
      400,
      "invalid_query",
      "assignmentId must be a single UUID.",
    );
  }

  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;

  let query = auth.context.supabase
    .from("submissions")
    .select(
      "id,tenant_id,assignment_id,student_id,content,idempotency_key,status,submitted_at,feedback,feedback_at,feedback_by",
    )
    .order("submitted_at", { ascending: false });
  if (assignmentId) query = query.eq("assignment_id", assignmentId);

  const { data, error } = await query;
  if (error) return databaseError("Unable to load submissions.");

  const studentIds = [...new Set((data ?? []).map((row) => row.student_id))];
  const peopleResult =
    studentIds.length === 0
      ? { data: [], error: null }
      : await auth.context.supabase
          .from("memberships")
          .select("user_id,display_name")
          .in("user_id", studentIds);
  if (peopleResult.error) {
    return databaseError("Unable to load submission students.");
  }
  const names = new Map(
    (peopleResult.data ?? []).map((person) => [
      person.user_id,
      person.display_name,
    ]),
  );
  return json({
    submissions: (data ?? []).map((row) =>
      mapSubmission(row, names.get(row.student_id)),
    ),
  });
}

export async function POST(request: Request) {
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  if (auth.context.membership.role !== "student") {
    return apiError(403, "forbidden", "Student access is required.");
  }

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["assignmentId", "content"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }

  const assignmentId = body.value.assignmentId;
  const content =
    typeof body.value.content === "string" ? body.value.content.trim() : "";
  const idempotencyKey = request.headers.get("idempotency-key");
  if (
    !isUuid(assignmentId) ||
    !isUuid(idempotencyKey) ||
    content.length < 1 ||
    content.length > 20_000
  ) {
    return apiError(
      400,
      "invalid_body",
      "Submission details or Idempotency-Key are invalid.",
    );
  }

  const existingResult = await auth.context.supabase
    .from("submissions")
    .select("id,assignment_id,content")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingResult.error) {
    return databaseError("Unable to check submission idempotency.");
  }
  const replayed =
    existingResult.data?.assignment_id === assignmentId &&
    existingResult.data.content === content;

  const { data, error } = await auth.context.supabase.rpc("submit_assignment", {
    p_assignment_id: assignmentId,
    p_content: content,
    p_idempotency_key: idempotencyKey,
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
    if (result.error) return databaseError("Unable to load submission.");
    row = result.data;
  }
  if (!row) return databaseError("Submission returned no record.");
  return json(
    {
      submission: mapSubmission(
        row,
        auth.context.membership.display_name,
      ),
    },
    replayed ? 200 : 201,
  );
}
