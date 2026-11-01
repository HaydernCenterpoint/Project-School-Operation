import {
  apiError,
  getCommunityContext,
  json,
  mapCommunityReport,
  mapCommunityRpcError,
  rpcRows,
} from "@/lib/academic-api";

export async function GET(request: Request) {
  if ([...new URL(request.url).searchParams.keys()].length > 0) {
    return apiError(400, "invalid_query", "Query parameters are not supported.");
  }
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;
  if (!["moderator", "admin"].includes(auth.context.membership.role)) {
    return apiError(403, "forbidden", "Moderator access is required.");
  }
  const { data, error } = await auth.context.supabase.rpc(
    "list_community_moderation_queue",
  );
  if (error) return mapCommunityRpcError(error);
  return json({ reports: rpcRows(data).map(mapCommunityReport) });
}
