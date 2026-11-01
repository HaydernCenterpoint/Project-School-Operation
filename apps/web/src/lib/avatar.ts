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

type PortraitSpec = {
  bgA: string;
  bgB: string;
  shirt: string;
  collar: string;
  skin: string;
  hair: string;
  hairStyle: "short" | "parted" | "long" | "bob" | "bun" | "curly";
  glasses?: boolean;
  headset?: boolean;
  badge?: string;
};

function renderPortraitSvg(spec: PortraitSpec): string {
  const hairBack =
    spec.hairStyle === "long"
      ? `<path d="M40 68c0-26 18-44 40-44s40 18 40 44v48c0 8-6 14-14 14H54c-8 0-14-6-14-14V68Z" fill="${spec.hair}"/>`
      : spec.hairStyle === "bob"
        ? `<path d="M42 68c0-24 17-41 38-41s38 17 38 41v26c0 10-8 18-18 18H60c-10 0-18-8-18-18V68Z" fill="${spec.hair}"/>`
        : spec.hairStyle === "bun"
          ? `<circle cx="80" cy="22" r="14" fill="${spec.hair}"/><path d="M46 66c0-22 15-38 34-38s34 16 34 38v16H46V66Z" fill="${spec.hair}"/>`
          : "";

  const hairFront =
    spec.hairStyle === "short"
      ? `<path d="M48 64c0-20 14-34 32-34s32 14 32 34c-6-8-15-12-28-12-10 0-22 4-36 12Z" fill="${spec.hair}"/>`
      : spec.hairStyle === "parted"
        ? `<path d="M46 66c1-22 15-36 34-36 19 0 34 14 34 36-7-10-16-15-26-16-8 6-20 12-42 16Z" fill="${spec.hair}"/>`
        : spec.hairStyle === "curly"
          ? `<path d="M45 66c-2-21 14-38 35-38s37 17 35 38c-5-8-12-12-21-11-6 4-13 6-21 4-8 3-17 4-28 7Z" fill="${spec.hair}"/><circle cx="54" cy="40" r="9" fill="${spec.hair}"/><circle cx="80" cy="34" r="10" fill="${spec.hair}"/><circle cx="104" cy="40" r="9" fill="${spec.hair}"/>`
          : `<path d="M46 66c2-21 16-36 34-36s32 15 34 36c-8-9-18-14-30-15-9 7-21 12-38 15Z" fill="${spec.hair}"/>`;

  const glasses = spec.glasses
    ? `<g stroke="#1f2430" stroke-width="2.6" fill="none"><rect x="57" y="64" width="18" height="13" rx="4" fill="#ffffff" fill-opacity="0.18"/><rect x="85" y="64" width="18" height="13" rx="4" fill="#ffffff" fill-opacity="0.18"/><path d="M75 70h10"/></g>`
    : "";

  const headset = spec.headset
    ? `<path d="M43 72a37 37 0 0 1 74 0" stroke="#1e293b" stroke-width="4.5" fill="none"/><rect x="38" y="66" width="9" height="18" rx="4.5" fill="#dc2626"/><rect x="113" y="66" width="9" height="18" rx="4.5" fill="#dc2626"/>`
    : "";

  const badge = spec.badge
    ? `<rect x="108" y="12" width="40" height="20" rx="6" fill="#0f172a" fill-opacity="0.45"/><text x="128" y="26" text-anchor="middle" fill="#ffffff" font-family="ui-monospace,monospace" font-size="11" font-weight="700">${spec.badge}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${spec.bgA}"/>
        <stop offset="100%" stop-color="${spec.bgB}"/>
      </linearGradient>
      <clipPath id="clip">
        <rect width="160" height="160" rx="28"/>
      </clipPath>
    </defs>
    <g clip-path="url(#clip)">
      <rect width="160" height="160" fill="url(#bg)"/>
      <circle cx="132" cy="26" r="44" fill="#ffffff" fill-opacity="0.08"/>
      <circle cx="24" cy="136" r="52" fill="#000000" fill-opacity="0.08"/>
      ${hairBack}
      <path d="M26 162c6-30 25-46 54-46s48 16 54 46H26Z" fill="${spec.shirt}"/>
      <path d="M64 114 80 134 96 114" fill="${spec.collar}"/>
      <rect x="71" y="92" width="18" height="24" rx="8" fill="${spec.skin}"/>
      <circle cx="48" cy="74" r="6" fill="${spec.skin}"/>
      <circle cx="112" cy="74" r="6" fill="${spec.skin}"/>
      <rect x="49" y="40" width="62" height="64" rx="29" fill="${spec.skin}"/>
      <circle cx="66" cy="71" r="3.4" fill="#1e2430"/>
      <circle cx="94" cy="71" r="3.4" fill="#1e2430"/>
      <circle cx="67.2" cy="69.8" r="1.1" fill="#ffffff"/>
      <circle cx="95.2" cy="69.8" r="1.1" fill="#ffffff"/>
      <path d="M60 61c3.5-2.2 8-2.2 11.5 0" stroke="#3b2f2f" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M88.5 61c3.5-2.2 8-2.2 11.5 0" stroke="#3b2f2f" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="60" cy="79" rx="5" ry="2.6" fill="#f43f5e" fill-opacity="0.24"/>
      <ellipse cx="100" cy="79" rx="5" ry="2.6" fill="#f43f5e" fill-opacity="0.24"/>
      <path d="M73 86c4.2 3.6 9.8 3.6 14 0" stroke="#883932" stroke-width="2.6" stroke-linecap="round"/>
      ${hairFront}
      ${glasses}
      ${headset}
      ${badge}
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const KNOWN_USER_PORTRAITS: Record<string, PortraitSpec> = {
  "acc-leader-minh": {
    bgA: "#7f1d1d",
    bgB: "#c81e32",
    shirt: "#1e293b",
    collar: "#f8fafc",
    skin: "#fde2c8",
    hair: "#1e1b24",
    hairStyle: "parted",
    headset: true,
    badge: "CLB",
  },
  "acc-student-linh": {
    bgA: "#6d28d9",
    bgB: "#db2777",
    shirt: "#fdf2f8",
    collar: "#fbcfe8",
    skin: "#ffe4d0",
    hair: "#271722",
    hairStyle: "long",
    badge: "LT",
  },
  "acc-student-hoang": {
    bgA: "#0f3d5e",
    bgB: "#0284c7",
    shirt: "#0f172a",
    collar: "#38bdf8",
    skin: "#f7d4b6",
    hair: "#1f242d",
    hairStyle: "short",
    glasses: true,
  },
  "acc-teacher-duc": {
    bgA: "#1e293b",
    bgB: "#334155",
    shirt: "#0f172a",
    collar: "#e2e8f0",
    skin: "#f6d2b4",
    hair: "#26272b",
    hairStyle: "parted",
    glasses: true,
    badge: "GV",
  },
  "acc-student-2200301": {
    bgA: "#0f766e",
    bgB: "#14b8a6",
    shirt: "#134e4a",
    collar: "#ccfbf1",
    skin: "#ffe4ce",
    hair: "#291d23",
    hairStyle: "bob",
  },
  "acc-student-2200302": {
    bgA: "#1d4ed8",
    bgB: "#3b82f6",
    shirt: "#1e293b",
    collar: "#dbeafe",
    skin: "#f7d3b5",
    hair: "#18181b",
    hairStyle: "short",
    glasses: true,
  },
  "acc-student-2200303": {
    bgA: "#9d174d",
    bgB: "#f43f5e",
    shirt: "#fff1f2",
    collar: "#fecdd3",
    skin: "#ffe6d4",
    hair: "#3b1d28",
    hairStyle: "long",
  },
  "acc-student-2200304": {
    bgA: "#b45309",
    bgB: "#f59e0b",
    shirt: "#7c2d12",
    collar: "#fef3c7",
    skin: "#f2c6a0",
    hair: "#1c1917",
    hairStyle: "curly",
  },
  "acc-student-2200305": {
    bgA: "#4338ca",
    bgB: "#ec4899",
    shirt: "#ffffff",
    collar: "#e0e7ff",
    skin: "#ffe6d5",
    hair: "#2e1a29",
    hairStyle: "bun",
    glasses: true,
  },
  "acc-student-2200306": {
    bgA: "#1e3a8a",
    bgB: "#0ea5e9",
    shirt: "#0f172a",
    collar: "#bae6fd",
    skin: "#f7d5b8",
    hair: "#1e293b",
    hairStyle: "parted",
    headset: true,
  },
  "acc-student-2200307": {
    bgA: "#be123c",
    bgB: "#fb7185",
    shirt: "#1f2937",
    collar: "#ffe4e6",
    skin: "#ffe8d6",
    hair: "#2b1922",
    hairStyle: "bob",
  },
  "acc-student-2200308": {
    bgA: "#065f46",
    bgB: "#10b981",
    shirt: "#111827",
    collar: "#a7f3d0",
    skin: "#f4cca8",
    hair: "#18181b",
    hairStyle: "short",
    glasses: true,
  },
  "acc-student-2200309": {
    bgA: "#7c3aed",
    bgB: "#a855f7",
    shirt: "#faf5ff",
    collar: "#e9d5ff",
    skin: "#ffe5d1",
    hair: "#2a1832",
    hairStyle: "long",
  },
  "acc-student-2200310": {
    bgA: "#9a3412",
    bgB: "#ea580c",
    shirt: "#1c1917",
    collar: "#ffedd5",
    skin: "#f3c7a2",
    hair: "#1c1917",
    hairStyle: "parted",
  },
};

const FALLBACK_SPECS: PortraitSpec[] = [
  { bgA: "#8f111d", bgB: "#d62839", shirt: "#1e293b", collar: "#f8fafc", skin: "#fde2c8", hair: "#1f1d24", hairStyle: "parted" },
  { bgA: "#1d4ed8", bgB: "#38bdf8", shirt: "#0f172a", collar: "#e0f2fe", skin: "#f7d5b8", hair: "#18181b", hairStyle: "short", glasses: true },
  { bgA: "#6d28d9", bgB: "#ec4899", shirt: "#fdf2f8", collar: "#fbcfe8", skin: "#ffe6d5", hair: "#2b1926", hairStyle: "long" },
  { bgA: "#0f766e", bgB: "#10b981", shirt: "#134e4a", collar: "#d1fae5", skin: "#ffe2cc", hair: "#231d20", hairStyle: "bob" },
  { bgA: "#b45309", bgB: "#f59e0b", shirt: "#1c1917", collar: "#fef3c7", skin: "#f4cca8", hair: "#1c1917", hairStyle: "curly" },
  { bgA: "#3730a3", bgB: "#818cf8", shirt: "#ffffff", collar: "#e0e7ff", skin: "#ffe6d5", hair: "#261b2e", hairStyle: "bun", glasses: true },
];

const defaultAvatarCache = new Map<string, string>();

export function getDefaultUserAvatar(userId?: string | null, displayName?: string | null): string {
  const canonical = normalizeAvatarUserId(userId) ?? displayName ?? "student";
  const cached = defaultAvatarCache.get(canonical);
  if (cached) return cached;

  const known = KNOWN_USER_PORTRAITS[canonical];
  if (known) {
    const url = renderPortraitSvg(known);
    defaultAvatarCache.set(canonical, url);
    return url;
  }

  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash * 31 + canonical.charCodeAt(i)) | 0;
  }
  const spec = FALLBACK_SPECS[Math.abs(hash) % FALLBACK_SPECS.length]!;
  const url = renderPortraitSvg(spec);
  defaultAvatarCache.set(canonical, url);
  return url;
}

export const avatarPresets: AvatarPreset[] = [
  {
    id: "phuong-crimson",
    label: "Chủ nhiệm CLB",
    dataUrl: renderPortraitSvg(KNOWN_USER_PORTRAITS["acc-leader-minh"]!),
  },
  {
    id: "linh-violet",
    label: "Nữ sinh CNTT",
    dataUrl: renderPortraitSvg(KNOWN_USER_PORTRAITS["acc-student-linh"]!),
  },
  {
    id: "cntt-slate",
    label: "Kỹ sư phần mềm",
    dataUrl: renderPortraitSvg(KNOWN_USER_PORTRAITS["acc-student-hoang"]!),
  },
  {
    id: "botanical-jade",
    label: "Thực tập sinh Frontend",
    dataUrl: renderPortraitSvg(KNOWN_USER_PORTRAITS["acc-student-2200306"]!),
  },
  {
    id: "english-club",
    label: "Ngoại ngữ & IELTS",
    dataUrl: renderPortraitSvg(KNOWN_USER_PORTRAITS["acc-student-2200305"]!),
  },
  {
    id: "mentor-slate",
    label: "Giảng viên cố vấn",
    dataUrl: renderPortraitSvg(KNOWN_USER_PORTRAITS["acc-teacher-duc"]!),
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
 * Center-crops an uploaded image file into a square and encodes it as a compact WebP/JPEG data URL.
 */
export async function cropAvatarFile(file: File, targetSize = 192): Promise<string> {
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

    const size = targetSize;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    canonicalId ? getDefaultUserAvatar(canonicalId) : null,
  );

  useEffect(() => {
    const sync = () => {
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(LEGACY_CURRENT_KEY);
      } catch {
        // Ignore storage errors
      }
      const stored = readStoredAvatar(canonicalId);
      setAvatarUrl(stored ?? (canonicalId ? getDefaultUserAvatar(canonicalId) : null));
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
