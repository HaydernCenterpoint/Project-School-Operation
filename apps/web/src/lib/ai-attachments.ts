// Turns uploaded study files into Anthropic Messages content blocks (server), and holds the
// limits and text types the browser checks too (lib/ai-files.ts).
// Files are sniffed by their bytes (never trusted by name or declared type), checked against
// the limits below, and used for this one request only; nothing is stored.

/** Shared with the client, which enforces the same numbers before uploading. */
export const attachmentLimits = {
  maxFiles: 100,
  /** What the student may attach per message (original sizes). */
  maxUploadBytes: 30 * 1024 * 1024,
  /**
   * Images and PDFs travel base64-encoded (x4/3); the provider accepts 32 MB per request,
   * so binary content is capped well under that after encoding.
   */
  maxBinaryBytes: 22 * 1024 * 1024,
  /** Per image the API accepts 10 MB base64, about 7.5 MB raw. */
  maxImageBytes: 7.5 * 1024 * 1024,
  /** About 130k tokens of text across all text files. */
  maxTextChars: 400_000,
} as const;

export const textExtensions = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "xml", "html", "htm", "css", "scss", "js", "jsx", "ts", "tsx",
  "mjs", "cjs", "py", "ipynb", "java", "kt", "c", "h", "cpp", "hpp", "cs", "go", "rs", "php", "rb", "swift", "sql",
  "yml", "yaml", "toml", "ini", "cfg", "env.example", "log", "sh", "bat", "ps1", "vue", "svelte", "tex", "r", "m", "dart",
]);

type ImageMedia = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
export type AttachmentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: ImageMedia; data: string } }
  | { type: "document"; title: string; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "document"; title: string; source: { type: "text"; media_type: "text/plain"; data: string } };

export type AttachmentError = { code: "too_many_files" | "attachment_too_large" | "unsupported_file" | "text_too_long"; file?: string };

function sniffImage(bytes: Uint8Array): ImageMedia | null {
  const starts = (...sig: number[]) => sig.every((value, index) => bytes[index] === value);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

const isPdf = (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";

function extension(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".env.example")) return "env.example";
  const dot = lower.lastIndexOf(".");
  return dot < 0 ? "" : lower.slice(dot + 1);
}

/** Display name: the folder-relative path the client sent, stripped of control characters. */
export function cleanName(name: string) {
  return name.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\\/g, "/").slice(0, 200) || "tệp";
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/** Converts uploaded files to content blocks, or explains which limit a file broke. */
export async function toAttachmentBlocks(files: File[]): Promise<{ blocks: AttachmentBlock[]; names: string[] } | { error: AttachmentError }> {
  if (files.length > attachmentLimits.maxFiles) return { error: { code: "too_many_files" } };
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > attachmentLimits.maxUploadBytes) return { error: { code: "attachment_too_large" } };

  const blocks: AttachmentBlock[] = [];
  const names: string[] = [];
  let binary = 0;
  let textChars = 0;
  for (const file of files) {
    const name = cleanName(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = sniffImage(bytes);
    if (image || isPdf(bytes)) {
      binary += bytes.length;
      if (binary > attachmentLimits.maxBinaryBytes || (image && bytes.length > attachmentLimits.maxImageBytes)) {
        return { error: { code: "attachment_too_large", file: name } };
      }
      if (image) {
        // A label before each image lets the student and the model refer to it by name.
        blocks.push({ type: "text", text: `Ảnh đính kèm: ${name}` });
        blocks.push({ type: "image", source: { type: "base64", media_type: image, data: toBase64(bytes) } });
      } else {
        blocks.push({ type: "document", title: name, source: { type: "base64", media_type: "application/pdf", data: toBase64(bytes) } });
      }
    } else if (textExtensions.has(extension(name))) {
      // Binary data renamed to .txt would carry NUL bytes; reject rather than send noise.
      if (bytes.includes(0)) return { error: { code: "unsupported_file", file: name } };
      const text = new TextDecoder("utf-8").decode(bytes);
      textChars += text.length;
      if (textChars > attachmentLimits.maxTextChars) return { error: { code: "text_too_long", file: name } };
      if (text.trim()) blocks.push({ type: "document", title: name, source: { type: "text", media_type: "text/plain", data: text } });
    } else {
      return { error: { code: "unsupported_file", file: name } };
    }
    names.push(name);
  }
  return { blocks, names };
}

export const attachmentNoteMarker = "\n\n📎 Tệp đính kèm";

/** Line saved with the student's message so history shows what was attached (files are not stored). */
export function attachmentNote(names: string[], room: number) {
  if (!names.length || room < 40) return "";
  let note = `${attachmentNoteMarker} (${names.length}): `;
  for (const [index, name] of names.entries()) {
    const piece = `${index ? ", " : ""}${name}`;
    const rest = `, và ${names.length - index} tệp khác`;
    if (note.length + piece.length + rest.length > room) return `${note}${index ? rest : ""}`;
    note += piece;
  }
  return note;
}
