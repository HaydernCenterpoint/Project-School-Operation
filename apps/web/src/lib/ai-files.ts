"use client";

// Browser side of AI attachments: classify picked/dropped files and folders, shrink images,
// and enforce the same limits the server checks again (lib/ai-attachments.ts).
import { attachmentLimits, textExtensions } from "./ai-attachments";

export type Attachment = {
  id: string;
  /** Folder-relative path for files that came from a folder. */
  name: string;
  kind: "image" | "pdf" | "text";
  /** Original size, which is what the 30 MB allowance counts. */
  size: number;
  /** What is uploaded: the original file, or a resized image. */
  blob: Blob;
  preview?: string;
};

export type AddResult = { added: Attachment[]; skipped: string[]; error?: string };

const imageTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
/** Folders and files that are never study material. */
const ignored = /(^|\/)(\.[^/]*|node_modules|__pycache__|dist|build|\.next|venv|target)(\/|$)/;
/** Long edge for images: above 20 images per request the API requires 2000 px or less. */
const maxEdge = 2000;

function extensionOf(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".env.example")) return "env.example";
  const dot = lower.lastIndexOf(".");
  return dot < 0 ? "" : lower.slice(dot + 1);
}

export function kindOf(file: File): Attachment["kind"] | null {
  if (imageTypes.has(file.type)) return "image";
  if (file.type === "application/pdf" || extensionOf(file.name) === "pdf") return "pdf";
  return textExtensions.has(extensionOf(file.name)) ? "text" : null;
}

/** Downscales large photos (and re-encodes them as JPEG) so they fit the per-image limits. */
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 3 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await canvas.convertToBlob({ type: "image/jpeg", quality: 0.86 });
  } catch {
    return file;
  }
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Adds files to the tray. `pathOf` gives a folder-relative path when known. Unsupported and
 * ignored files are listed in `skipped`; exceeding a limit stops with `error`.
 */
export async function addFiles(files: File[], current: Attachment[], pathOf: (file: File) => string = (file) => file.webkitRelativePath || file.name): Promise<AddResult> {
  const added: Attachment[] = [];
  const skipped: string[] = [];
  let total = current.reduce((sum, item) => sum + item.size, 0);
  for (const file of files) {
    const name = pathOf(file);
    if (ignored.test(name)) continue;
    const kind = kindOf(file);
    if (!kind) {
      skipped.push(name);
      continue;
    }
    if (current.length + added.length >= attachmentLimits.maxFiles) {
      return { added, skipped, error: `Tối đa ${attachmentLimits.maxFiles} tệp cho mỗi tin nhắn.` };
    }
    if (total + file.size > attachmentLimits.maxUploadBytes) {
      return { added, skipped, error: `Vượt quá 30 MB: không thêm được "${name}".` };
    }
    const blob = kind === "image" ? await shrinkImage(file) : file;
    total += file.size;
    added.push({
      id: crypto.randomUUID(),
      name,
      kind,
      size: file.size,
      blob,
      preview: kind === "image" ? URL.createObjectURL(blob) : undefined,
    });
  }
  const binary = [...current, ...added].filter((item) => item.kind !== "text").reduce((sum, item) => sum + item.blob.size, 0);
  if (binary > attachmentLimits.maxBinaryBytes) {
    return { added: [], skipped, error: "Ảnh và PDF sau khi nén vượt khoảng 22 MB (giới hạn gửi cho AI). Hãy bớt PDF lớn." };
  }
  return { added, skipped };
}

type Entry = { isFile: boolean; isDirectory: boolean; fullPath: string; name: string };
type FileEntry = Entry & { file: (done: (file: File) => void, fail: (error: unknown) => void) => void };
type DirEntry = Entry & { createReader: () => { readEntries: (done: (entries: Entry[]) => void, fail: (error: unknown) => void) => void } };

/** Expands a drop (files and whole folders) into files with their relative paths. */
export async function filesFromDrop(items: DataTransferItemList): Promise<{ file: File; path: string }[]> {
  const out: { file: File; path: string }[] = [];
  const walk = async (entry: Entry): Promise<void> => {
    const path = entry.fullPath.replace(/^\//, "");
    if (ignored.test(path)) return;
    if (entry.isFile) {
      const file = await new Promise<File>((done, fail) => (entry as FileEntry).file(done, fail));
      out.push({ file, path });
    } else if (entry.isDirectory) {
      const reader = (entry as DirEntry).createReader();
      // readEntries returns batches; keep reading until it returns none.
      for (;;) {
        const batch = await new Promise<Entry[]>((done, fail) => reader.readEntries(done, fail));
        if (!batch.length) break;
        for (const child of batch) await walk(child);
        if (out.length > attachmentLimits.maxFiles * 4) return;
      }
    }
  };
  const entries = [...items]
    .map((item) => (item.webkitGetAsEntry?.() as Entry | null) ?? null)
    .filter((entry): entry is Entry => entry !== null);
  for (const entry of entries) await walk(entry);
  return out;
}
