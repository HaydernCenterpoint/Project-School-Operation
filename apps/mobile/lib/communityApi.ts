import type {
  CommunityMessage,
  CommunityReportReason,
  CommunitySpace,
} from "@sao-do/contracts";

import { academicRequest } from "@/lib/academicApi";

type SpacesResponse = { spaces: CommunitySpace[] };
type MessagesResponse = { messages: CommunityMessage[] };
type MessageResponse = { message: CommunityMessage };
type ActiveResponse = { active: boolean };

export function listCommunitySpaces(accessToken: string) {
  return academicRequest<SpacesResponse>("/api/community/spaces", accessToken);
}

export function listCommunityMessages(spaceId: string, accessToken: string) {
  return academicRequest<MessagesResponse>(
    `/api/community/spaces/${encodeURIComponent(spaceId)}/messages`,
    accessToken,
  );
}

export function createCommunityMessage(
  spaceId: string,
  accessToken: string,
  idempotencyKey: string,
  input: {
    privacyWarningConfirmed: boolean;
    replyToId: string | null;
    text: string;
  },
) {
  return academicRequest<MessageResponse>(
    `/api/community/spaces/${encodeURIComponent(spaceId)}/messages`,
    accessToken,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      method: "POST",
    },
  );
}

export function setCommunityReaction(
  messageId: string,
  accessToken: string,
  active: boolean,
) {
  return academicRequest<ActiveResponse>(
    `/api/community/messages/${encodeURIComponent(messageId)}/reactions`,
    accessToken,
    {
      body: JSON.stringify({ active, reaction: "like" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function reportCommunityMessage(
  messageId: string,
  accessToken: string,
  reason: CommunityReportReason = "other",
) {
  return academicRequest<{ reportId: string }>(
    `/api/community/messages/${encodeURIComponent(messageId)}/reports`,
    accessToken,
    {
      body: JSON.stringify({ detail: null, reason }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function setCommunityUserBlock(
  userId: string,
  accessToken: string,
  active: boolean,
) {
  return academicRequest<ActiveResponse>(
    `/api/community/users/${encodeURIComponent(userId)}/block`,
    accessToken,
    {
      body: JSON.stringify({ active }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export function setCommunityMute(
  spaceId: string,
  accessToken: string,
  active: boolean,
) {
  return academicRequest<ActiveResponse>(
    `/api/community/spaces/${encodeURIComponent(spaceId)}/mute`,
    accessToken,
    {
      body: JSON.stringify({ active }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export async function leaveCommunitySpace(
  spaceId: string,
  accessToken: string,
) {
  await academicRequest<unknown>(
    `/api/community/spaces/${encodeURIComponent(spaceId)}/leave`,
    accessToken,
    {
      body: "{}",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}
