import { isCommunityReportReason } from "@sao-do/contracts";
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
  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["reason", "detail"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const detail =
    typeof body.value.detail === "string" ? body.value.detail.trim() : null;
  if (
    !isCommunityReportReason(body.value.reason) ||
    (body.value.detail !== null && detail === null) ||
    (detail?.length ?? 0) > 1_000
  ) {
    return apiError(400, "invalid_body", "Report details are invalid.");
  }

  const reportId = crypto.randomUUID();
  const { data, error } = await auth.context.supabase.rpc(
    "report_community_message",
    {
      p_report_id: reportId,
      p_message_id: id,
      p_reason: body.value.reason,
      p_detail: detail || null,
    },
  );
  if (error) return mapCommunityRpcError(error);
  return json({ reportId: isUuid(data) ? data : reportId }, 201);
}
