import type { AiUsage } from "@sao-do/contracts";
import {
  apiError,
  databaseError,
  getAcademicContext,
  json,
  singleRpcRow,
} from "@/lib/academic-api";
import { aiConfig } from "@/lib/ai-provider";

export async function GET(request: Request) {
  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  if (auth.context.membership.role !== "student") {
    return apiError(403, "forbidden", "Student access is required.");
  }

  const { data, error } = await auth.context.supabase.rpc("ai_usage_status");
  if (error) return databaseError();
  const row = singleRpcRow(data);
  const usage: AiUsage = {
    enabled: aiConfig() !== null,
    used: Number(row?.used ?? 0),
    limit: Number(row?.daily_limit ?? 0),
    resetsAt: row?.resets_at ? String(row.resets_at) : null,
  };
  return json(usage);
}
