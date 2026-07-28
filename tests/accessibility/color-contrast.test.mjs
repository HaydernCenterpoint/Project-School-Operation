import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("critical brand and status text pairs meet WCAG AA contrast", () => {
  const pairs = [
    ["ink on paper", "#071a34", "#ffffff"],
    ["blue on paper", "#0066cc", "#ffffff"],
    ["red on paper", "#d60000", "#ffffff"],
    ["muted on paper", "#61708a", "#ffffff"],
    ["danger on paper", "#b42318", "#ffffff"],
    ["paper on red action", "#ffffff", "#d60000"],
    ["paper on blue", "#ffffff", "#0066cc"],
    ["ink on yellow navigation", "#071a34", "#ffea00"],
    ["submitted status", "#174ea6", "#dceaff"],
    ["reviewed status", "#075f36", "#dff7ea"],
  ];

  for (const [label, foreground, background] of pairs) {
    assert.ok(
      contrast(foreground, background) >= 4.5,
      `${label} contrast is ${contrast(foreground, background).toFixed(2)}:1`,
    );
  }
});

test("interactive control boundaries meet WCAG non-text contrast", () => {
  const pairs = [
    ["web control border", "#61708a", "#ffffff"],
    ["mobile control border", "#61708a", "#ffffff"],
  ];

  for (const [label, boundary, background] of pairs) {
    assert.ok(
      contrast(boundary, background) >= 3,
      `${label} contrast is ${contrast(boundary, background).toFixed(2)}:1`,
    );
  }

  const webCss = readFileSync(
    resolve(root, "apps/web/src/app/globals.css"),
    "utf8",
  );
  const mobileLogin = readFileSync(
    resolve(root, "apps/mobile/app/index.tsx"),
    "utf8",
  );
  const mobileAssignment = readFileSync(
    resolve(root, "apps/mobile/app/assignment/[id].tsx"),
    "utf8",
  );
  assert.match(webCss, /\.login-form input \{[^}]*border: 1px solid var\(--muted\)/s);
  assert.match(
    webCss,
    /\.academic-form input[^}]*border: 1px solid var\(--muted\)/s,
  );
  assert.match(
    webCss,
    /\.submission-list form textarea \{[^}]*border: 1px solid var\(--muted\)/s,
  );
  assert.match(mobileLogin, /input: \{[^}]*borderColor: colors\.muted/s);
  assert.match(
    mobileAssignment,
    /input: \{[^}]*borderColor: colors\.muted/s,
  );
});
