import type { AiTutorConsent } from "@sao-do/contracts";
import { getAiProviderConfiguration } from "@/lib/ai-gateway";
import {
  apiError,
  type AcademicContext,
  databaseError,
  getAcademicContext,
  hasExactKeys,
  json,
  readJsonObject,
} from "@/lib/academic-api";

async function consentStatus(context: AcademicContext) {
  const { membership, supabase, user } = context;
  const [policyResult, consentResult] = await Promise.all([
    supabase
      .from("ai_tenant_policies")
      .select(
        "tutor_enabled,privacy_policy_version,privacy_approved_at,provider,model",
      )
      .eq("tenant_id", membership.tenant_id)
      .maybeSingle(),
    supabase
      .from("ai_consents")
      .select("granted,policy_version")
      .eq("tenant_id", membership.tenant_id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (policyResult.error || consentResult.error || !policyResult.data) {
    return { response: databaseError("Unable to load AI Tutor consent.") };
  }
  const currentPolicyVersion = policyResult.data.privacy_policy_version;
  const provider = getAiProviderConfiguration();
  const providerMatches =
    provider.configuration !== undefined &&
    provider.configuration.provider === policyResult.data.provider &&
    provider.configuration.model === policyResult.data.model;
  const policyVersion = consentResult.data?.policy_version ?? null;
  const granted =
    consentResult.data?.granted === true &&
    policyVersion === currentPolicyVersion;
  const value: AiTutorConsent = {
    tutorEnabled:
      policyResult.data.tutor_enabled === true &&
      policyResult.data.privacy_approved_at !== null &&
      providerMatches,
    granted,
    policyVersion,
    currentPolicyVersion,
    consentRequired: !granted,
  };
  return { value };
}

async function studentContext(request: Request) {
  const auth = await getAcademicContext(request);
  if (auth.response) return auth;
  if (auth.context.membership.role !== "student") {
    return {
      response: apiError(403, "forbidden", "Student access is required."),
    };
  }
  return auth;
}

export async function GET(request: Request) {
  const auth = await studentContext(request);
  if (auth.response) return auth.response;
  const status = await consentStatus(auth.context);
  return status.response ?? json(status.value);
}

export async function POST(request: Request) {
  const auth = await studentContext(request);
  if (auth.response) return auth.response;

  const body = await readJsonObject(request);
  if (body.response) return body.response;
  if (!hasExactKeys(body.value, ["granted", "policyVersion"])) {
    return apiError(400, "invalid_body", "Body fields are invalid.");
  }
  const policyVersion =
    typeof body.value.policyVersion === "string"
      ? body.value.policyVersion.trim()
      : "";
  if (
    typeof body.value.granted !== "boolean" ||
    policyVersion.length < 1 ||
    policyVersion.length > 100
  ) {
    return apiError(400, "invalid_body", "Consent details are invalid.");
  }

  const result = await auth.context.supabase.rpc("set_ai_tutor_consent", {
    p_granted: body.value.granted,
    p_policy_version: policyVersion,
  });
  if (result.error) {
    const message = result.error.message?.trim().toLowerCase();
    if (message === "ai_consent_policy_mismatch") {
      return apiError(
        409,
        "policy_changed",
        "The AI Tutor policy has changed. Review the current policy.",
      );
    }
    if (message === "ai_consent_not_available") {
      return apiError(404, "not_found", "AI Tutor consent is not available.");
    }
    return databaseError("Unable to update AI Tutor consent.");
  }

  const status = await consentStatus(auth.context);
  return status.response ?? json(status.value);
}
