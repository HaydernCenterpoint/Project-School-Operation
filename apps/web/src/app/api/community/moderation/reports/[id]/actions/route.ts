import { isCommunityModerationAction } from "@sao-do/contracts";
import {
  apiError,
  getCommunityContext,
  hasExactKeys,
  isUuid,
  json,
  mapCommunityRpcError,
  readJsonObject,
} from "@/lib/academic-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, route: RouteContext) {
  const { id } = await route.params;
  if (!isUuid(id)) return apiError(404, "not_found", "Resource not found.");
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;
  if (!["moderator", "admin"].includes(auth.context.membership.role)) {
    return apiError(403, "forbidden", "Moderator access is required.");
  }
  const actionId = request.headers.get("Idempotency-Key");
  if (!isUuid(actionId)) {
    return apiError(
      400,
      "invalid_idempotency_key",
      "Idempotency-Key must be a UUID.",
    );
  }
  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["action", "note"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const note =
    typeof body.value.note === "string" ? body.value.note.trim() : null;
  if (
    !isCommunityModerationAction(body.value.action) ||
    (body.value.note !== null && note === null) ||
    (note?.length ?? 0) > 1_000
  ) {
    return apiError(400, "invalid_body", "Moderation details are invalid.");
  }
  const { data, error } = await auth.context.supabase.rpc(
    "moderate_community_report",
    {
      p_action_id: actionId,
      p_report_id: id,
      p_action: body.value.action,
      p_note: note || null,
    },
  );
  if (error) return mapCommunityRpcError(error);
  if (!isUuid(data)) {
    return apiError(500, "database_error", "Moderation returned no action.");
  }
  return json({ actionId: data, reportId: id, action: body.value.action });
}
