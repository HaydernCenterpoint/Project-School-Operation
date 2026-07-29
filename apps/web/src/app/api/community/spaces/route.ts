import {
  apiError,
  getCommunityContext,
  json,
  mapCommunityRpcError,
  mapCommunitySpace,
  rpcRows,
} from "@/lib/academic-api";

export async function GET(request: Request) {
  if ([...new URL(request.url).searchParams.keys()].length > 0) {
    return apiError(400, "invalid_query", "Query parameters are not supported.");
  }
  const auth = await getCommunityContext(request);
  if (auth.response) return auth.response;

  const { data, error } =
    await auth.context.supabase.rpc("list_community_spaces");
  if (error) return mapCommunityRpcError(error);
  return json({ spaces: rpcRows(data).map(mapCommunitySpace) });
}
