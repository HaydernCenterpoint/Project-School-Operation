import type { AiUsage } from "@sao-do/contracts";
import {
  getAcademicContext,
  json,
  singleRpcRow,
} from "@/lib/academic-api";
import { aiConfig } from "@/lib/ai-provider";

export async function GET(request: Request) {
  const cfg = aiConfig();
  const isLocalPortalSession =
    request.headers.get("authorization") === "Bearer local-multi-role-session";
  const auth = await getAcademicContext(request);
  if (auth.response) {
    if (!isLocalPortalSession) return auth.response;
    // Fallback for local multi-role portal accounts when Supabase is not active.
    const fallbackUsage: AiUsage = {
      enabled: cfg !== null,
      used: 0,
      limit: 100,
      resetsAt: null,
      model: "Model SDU 1.3 (Qwen 3.8)",
    };
    return json(fallbackUsage);
  }

  const { data, error } = await auth.context.supabase.rpc("ai_usage_status");
  if (error) {
    return json({
      enabled: cfg !== null,
      used: 0,
      limit: 100,
      resetsAt: null,
      model: "Model SDU 1.3 (Qwen 3.8)",
    } satisfies AiUsage);
  }
  const row = singleRpcRow(data);
  const usage: AiUsage = {
    enabled: cfg !== null,
    used: Number(row?.used ?? 0),
    limit: Number(row?.daily_limit ?? 100),
    resetsAt: row?.resets_at ? String(row.resets_at) : null,
    model: "Model SDU 1.3 (Qwen 3.8)",
  };
  return json(usage);
}
