import type { AiUsage } from "@sao-do/contracts";
import {
  getAcademicContext,
  json,
  singleRpcRow,
} from "@/lib/academic-api";
import { aiConfig } from "@/lib/ai-provider";

export async function GET(request: Request) {
  const cfg = aiConfig();
  const auth = await getAcademicContext(request);
  if (auth.response) {
    // Fallback for local multi-role portal accounts when Supabase is not active.
    const fallbackUsage: AiUsage = {
      enabled: cfg !== null,
      used: 0,
      limit: 100,
      resetsAt: null,
      model: cfg?.model ?? "gpt-6-luna",
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
      model: cfg?.model ?? "gpt-6-luna",
    } satisfies AiUsage);
  }
  const row = singleRpcRow(data);
  const usage: AiUsage = {
    enabled: cfg !== null,
    used: Number(row?.used ?? 0),
    limit: Number(row?.daily_limit ?? 100),
    resetsAt: row?.resets_at ? String(row.resets_at) : null,
    model: cfg?.model ?? "gpt-6-luna",
  };
  return json(usage);
}
