"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "./supabase-browser";

const CURRENT_KEY = "sao-do:avatar:current";
const USER_PREFIX = "sao-do:avatar:user:";
const EVENT_NAME = "sao-do:avatar-change";

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

export function readStoredAvatar(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (userId) {
      const byUser = localStorage.getItem(`${USER_PREFIX}${userId}`);
      if (byUser) return byUser;
    }
    const current = localStorage.getItem(CURRENT_KEY);
    return current || null;
  } catch {
    return null;
  }
}

export async function persistAvatar(userId: string | null | undefined, dataUrl: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl) {
      localStorage.setItem(CURRENT_KEY, dataUrl);
      if (userId) localStorage.setItem(`${USER_PREFIX}${userId}`, dataUrl);
    } else {
      localStorage.removeItem(CURRENT_KEY);
      if (userId) localStorage.removeItem(`${USER_PREFIX}${userId}`);
    }
  } catch {
    // Ignore storage quota errors in private browsing.
  }

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { userId: userId ?? null, avatarUrl: dataUrl },
    }),
  );

  if (hasSupabaseEnvironment) {
    try {
      // Never embed large base64 data URLs into JWT user_metadata (causes HTTP 431 Header Too Large)
      const safeMetaUrl = dataUrl && dataUrl.length <= 512 ? dataUrl : "";
      await getSupabaseBrowserClient().auth.updateUser({
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

/**
 * React hook that stays in sync with avatar changes across tabs and components.
 */
export function useAvatarSync(userId?: string | null, fallbackCurrent = false): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      if (typeof window === "undefined") return;
      try {
        if (userId) {
          const specific = localStorage.getItem(`${USER_PREFIX}${userId}`);
          if (specific) {
            setAvatarUrl(specific);
            return;
          }
        }
        if (fallbackCurrent) {
          setAvatarUrl(localStorage.getItem(CURRENT_KEY) || null);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(null);
      }
    };

    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId, fallbackCurrent]);

  return avatarUrl;
}
