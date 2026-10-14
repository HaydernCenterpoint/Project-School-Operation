// Parsing for the news sync: RSS feeds, article pages and Facebook posts into news items.
// No runtime imports, so it runs under a plain `node --test` (tests/unit/news-parse.test.mts).

export type NewsItem = {
  url: string;
  title: string;
  summary: string;
  image_url: string | null;
  published_at: string | null;
  ai_summary?: boolean;
};

const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLowerCase()] ?? whole);
}

/** Readable text from HTML: scripts and styles dropped, block breaks kept as newlines. */
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n[\s]*/g, "\n")
    .trim();
}

/** Absolute http(s) URL without the fragment (default ports drop out on their own), or null. */
export function absoluteUrl(value: string | null | undefined, base?: string) {
  if (!value) return null;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Sources are typed in by staff, so the server must not be pointed at itself or the local
 * network. ponytail: checks the hostname only; resolve DNS and re-check if sources ever become
 * self-service for non-staff.
 */
export function isPublicHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || /\.(local|localhost|internal|lan|home|test)$/.test(host) || host === "localhost") return false;
  if (host.includes(":")) return false; // IPv6 literals
  const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224) return false;
  }
  return true;
}

const tag = (block: string, name: string) => {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return match ? decodeEntities(match[1]!).trim() : "";
};

function isoDate(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** RSS 2.0 items, newest first as the feed lists them. */
export function parseRss(xml: string, feedUrl: string): NewsItem[] {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].flatMap(([, block]) => {
    const url = absoluteUrl(tag(block!, "link"), feedUrl);
    const title = htmlToText(tag(block!, "title"));
    if (!url || !title) return [];
    const description = tag(block!, "description");
    const image = /<img[^>]+src=["']([^"']+)["']/i.exec(description)?.[1];
    return [{
      url,
      title,
      summary: htmlToText(description).slice(0, 600),
      image_url: realImage(absoluteUrl(image, url)),
      published_at: isoDate(tag(block!, "pubDate")),
    }];
  });
}

const meta = (html: string, key: string) => {
  const match = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i").exec(html)?.[0];
  const content = match && /content=["']([^"']*)["']/i.exec(match)?.[1];
  return content ? decodeEntities(content).trim() : "";
};

/** NukeViet serves "no_images.jpg" when a post has no picture; that is not a picture. */
export const realImage = (url: string | null | undefined) => (url && !/\/no_?images?\.(jpe?g|png|gif)$/i.test(url) ? url : null);

/** Title, lead, image and body text of an article page (NukeViet first, any page with Open Graph after). */
export function extractArticle(html: string, pageUrl: string) {
  const start = html.search(/id=["']news-bodyhtml["']/i);
  const region = start >= 0
    ? html.slice(start, start + 60000)
    : (/<article\b[\s\S]*?<\/article>/i.exec(html)?.[0] ?? /<main\b[\s\S]*?<\/main>/i.exec(html)?.[0] ?? "");
  return {
    title: meta(html, "og:title"),
    lead: meta(html, "og:description") || meta(html, "description"),
    image_url: realImage(absoluteUrl(meta(html, "og:image"), pageUrl)),
    text: htmlToText(region.replace(/^[^>]*>/, "")).slice(0, 8000),
  };
}

export type FacebookPost = { id: string; message?: string; created_time?: string; permalink_url?: string; full_picture?: string };

/** A page post; its first line becomes the title, the rest the summary. */
export function facebookItem(post: FacebookPost): NewsItem | null {
  const message = (post.message ?? "").trim();
  const url = absoluteUrl(post.permalink_url);
  if (!message || !url) return null;
  const [first = "", ...rest] = message.split(/\n+/);
  const title = first.length > 140 ? `${first.slice(0, 137).trimEnd()}…` : first;
  return {
    url,
    title,
    summary: (rest.join("\n").trim() || message).slice(0, 600),
    image_url: absoluteUrl(post.full_picture),
    published_at: post.created_time ? isoDate(post.created_time) : null,
  };
}

/** Plain summary when no AI is configured: the page lead, else the opening of the text, cut at a sentence. */
export function fallbackSummary(lead: string, text: string) {
  const source = (lead || text).replace(/\s+/g, " ").trim();
  if (source.length <= 320) return source;
  const cut = source.slice(0, 320);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > 120 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}
