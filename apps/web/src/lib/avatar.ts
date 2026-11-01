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
  "nguyễn văn đạt": "acc-leader-minh",
  "nguyen van dat": "acc-leader-minh",
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

const STUDENT_2200286_PORTRAIT_DATA_URL =
  "data:image/jpeg;base64,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";

export function getDefaultUserAvatar(userId?: string | null, displayName?: string | null): string {
  const canonical = normalizeAvatarUserId(userId) ?? displayName ?? "student";
  const cached = defaultAvatarCache.get(canonical);
  if (cached) return cached;

  if (canonical === "acc-leader-minh") {
    defaultAvatarCache.set(canonical, STUDENT_2200286_PORTRAIT_DATA_URL);
    return STUDENT_2200286_PORTRAIT_DATA_URL;
  }

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
    label: "Ảnh thẻ gốc (2200286)",
    dataUrl: STUDENT_2200286_PORTRAIT_DATA_URL,
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
export function useAvatarSync(userId?: string | null, _fallbackCurrent?: boolean): string | null {
  void _fallbackCurrent;
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
