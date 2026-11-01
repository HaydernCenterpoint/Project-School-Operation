"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "./supabase-browser";

const LEGACY_CURRENT_KEY = "sao-do:avatar:current";
const USER_PREFIX = "sao-do:avatar:user:";
const MAP_STORAGE_KEY = "sao-do:avatar:by-user:v2";
const KV_AVATARS_KEY = "portal_user_avatars";
const EVENT_NAME = "sao-do:avatar-change";

const USER_ID_ALIASES: Record<string, string> = {
  "acc-teacher-duc": "acc-teacher-duc",
  "gv.cntt.018": "acc-teacher-duc",
  "ductm@saodo.edu.vn": "acc-teacher-duc",
  "acc-leader-minh": "acc-leader-minh",
  "2200286": "acc-leader-minh",
  "10000000-0000-0000-0000-000002200286": "acc-leader-minh",
  "2200286@sv.saodo.edu.vn": "acc-leader-minh",
  "acc-student-linh": "acc-student-linh",
  "2200287": "acc-student-linh",
  "10000000-0000-0000-0000-000002200287": "acc-student-linh",
  "2200287@sv.saodo.edu.vn": "acc-student-linh",
  "acc-student-hoang": "acc-student-hoang",
  "2200288": "acc-student-hoang",
  "10000000-0000-0000-0000-000002200288": "acc-student-hoang",
  "2200288@sv.saodo.edu.vn": "acc-student-hoang",
};

export function normalizeAvatarUserId(userId?: string | null): string | null {
  if (!userId) return null;
  const clean = userId.trim();
  if (!clean) return null;
  const mapped = USER_ID_ALIASES[clean.toLowerCase()];
  if (mapped) return mapped;
  const uidMatch = /^10000000-0000-0000-0000-00000(\d{7})$/.exec(clean);
  if (uidMatch) return `acc-student-${uidMatch[1]}`;
  return clean;
}

function readAvatarMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeAvatarMap(next: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors in private browsing.
  }
}

export type AvatarPreset = {
  id: string;
  label: string;
  dataUrl: string;
};

function makeSvgDataUrl(bgA: string, bgB: string, accent: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${bgA}"/>
        <stop offset="100%" stop-color="${bgB}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="24" fill="url(#g)"/>
    <circle cx="80" cy="60" r="26" fill="${accent}" fill-opacity="0.92"/>
    <path d="M34 142c6-26 24-40 46-40s40 14 46 40" fill="${accent}" fill-opacity="0.92"/>
    <text x="128" y="34" text-anchor="middle" fill="#fff" fill-opacity="0.75" font-family="monospace" font-size="14" font-weight="700">${glyph}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const avatarPresets: AvatarPreset[] = [
  {
    id: "phuong-crimson",
    label: "Đỏ phượng vĩ",
    dataUrl: makeSvgDataUrl("#8f111d", "#c81d2e", "#f6e9e2", "SDU"),
  },
  {
    id: "chilinh-amber",
    label: "Hoàng hôn Chí Linh",
    dataUrl: makeSvgDataUrl("#5a2418", "#b85d19", "#fff3e6", "K13"),
  },
  {
    id: "cntt-slate",
    label: "Kỹ thuật phần mềm",
    dataUrl: makeSvgDataUrl("#182638", "#2b4c6f", "#e8f1fc", "IT"),
  },
  {
    id: "botanical-jade",
    label: "Lá phượng xanh",
    dataUrl: makeSvgDataUrl("#143829", "#1f6f4a", "#e9f7ef", "SV"),
  },
];

function ensurePerUserMigration(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_CURRENT_KEY);
    const migKey = "sao-do:avatar:per-user-migrated:v2";
    if (localStorage.getItem(migKey) === "1") return;
    const tAvatar = localStorage.getItem(`${USER_PREFIX}acc-teacher-duc`);
    const lAvatar = localStorage.getItem(`${USER_PREFIX}acc-leader-minh`);
    if (tAvatar && lAvatar && tAvatar === lAvatar) {
      localStorage.removeItem(`${USER_PREFIX}acc-teacher-duc`);
    }
    localStorage.setItem(migKey, "1");
  } catch {
    // Ignore storage errors
  }
}

export function readStoredAvatar(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  ensurePerUserMigration();
  const canonicalId = normalizeAvatarUserId(userId);
  if (!canonicalId) return null;
  try {
    const map = readAvatarMap();
    if (map[canonicalId]) return map[canonicalId]!;
    const byCanonical = localStorage.getItem(`${USER_PREFIX}${canonicalId}`);
    if (byCanonical) return byCanonical;
    if (userId && userId !== canonicalId) {
      const byRaw = localStorage.getItem(`${USER_PREFIX}${userId}`);
      if (byRaw) return byRaw;
    }
    return null;
  } catch {
    return null;
  }
}

export async function persistAvatar(userId: string | null | undefined, dataUrl: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const canonicalId = normalizeAvatarUserId(userId);
  if (!canonicalId) return;

  const nextMap = { ...readAvatarMap() };
  try {
    // Remove legacy global key so one account's photo never leaks to other accounts.
    localStorage.removeItem(LEGACY_CURRENT_KEY);
    if (dataUrl) {
      nextMap[canonicalId] = dataUrl;
      localStorage.setItem(`${USER_PREFIX}${canonicalId}`, dataUrl);
      if (userId && userId !== canonicalId) {
        localStorage.setItem(`${USER_PREFIX}${userId}`, dataUrl);
      }
    } else {
      delete nextMap[canonicalId];
      localStorage.removeItem(`${USER_PREFIX}${canonicalId}`);
      if (userId && userId !== canonicalId) {
        localStorage.removeItem(`${USER_PREFIX}${userId}`);
      }
    }
    writeAvatarMap(nextMap);
  } catch {
    // Ignore storage quota errors in private browsing.
  }

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { userId: canonicalId, avatarUrl: dataUrl },
    }),
  );

  if (hasSupabaseEnvironment) {
    try {
      const sb = getSupabaseBrowserClient();
      await sb.from("portal_kv_store").upsert(
        {
          key: KV_AVATARS_KEY,
          value: nextMap,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      // Never embed large base64 data URLs into JWT user_metadata (causes HTTP 431 Header Too Large)
      const safeMetaUrl = dataUrl && dataUrl.length <= 512 ? dataUrl : "";
      await sb.auth.updateUser({
        data: { avatar_url: safeMetaUrl },
      });
    } catch {
      // Local storage remains the source of truth if offline.
    }
  }
}

/**
 * Center-crops an uploaded image file into a 192×192 square and encodes it as a compact WebP/JPEG data URL.
 */
export async function cropAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP hoặc GIF)");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Ảnh quá lớn (tối đa 15 MB)");
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Không đọc được tệp hình ảnh này"));
      element.src = bitmapUrl;
    });

    const size = 192;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");

    const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sx = ((img.naturalWidth || img.width) - minSide) / 2;
    const sy = ((img.naturalHeight || img.height) - minSide) / 2;

    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

    const webp = canvas.toDataURL("image/webp", 0.86);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

let remoteAvatarsPulled = false;

async function pullRemoteAvatarsOnce(): Promise<void> {
  if (remoteAvatarsPulled || typeof window === "undefined" || !hasSupabaseEnvironment) return;
  remoteAvatarsPulled = true;
  try {
    const sb = getSupabaseBrowserClient();
    const { data, error } = await sb
      .from("portal_kv_store")
      .select("value")
      .eq("key", KV_AVATARS_KEY)
      .maybeSingle();
    if (error || !data?.value || typeof data.value !== "object" || Array.isArray(data.value)) return;
    const remoteMap = data.value as Record<string, string>;
    const localMap = readAvatarMap();
    const merged: Record<string, string> = { ...remoteMap, ...localMap };
    writeAvatarMap(merged);
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === "string" && v) {
        localStorage.setItem(`${USER_PREFIX}${k}`, v);
      }
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { userId: null, avatarUrl: null } }));
  } catch {
    // Keep local avatars when offline.
  }
}

/**
 * React hook that stays in sync with per-user avatar changes across tabs and components.
 */
export function useAvatarSync(userId?: string | null, _fallbackCurrent = false): string | null {
  const canonicalId = normalizeAvatarUserId(userId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(LEGACY_CURRENT_KEY);
      } catch {
        // Ignore storage errors
      }
      setAvatarUrl(readStoredAvatar(canonicalId));
    };

    sync();
    void pullRemoteAvatarsOnce();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [canonicalId]);

  return avatarUrl;
}
