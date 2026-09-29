"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Fenced code in an AI answer: language label and a copy button. */
export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className="md-code">
      <figcaption>
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            })
          }
          aria-label={copied ? "Đã sao chép mã" : "Sao chép mã"}
        >
          <Icon name={copied ? "check" : "copy"} /> {copied ? "Đã chép" : "Sao chép"}
        </button>
      </figcaption>
      <pre><code>{code}</code></pre>
    </figure>
  );
}
