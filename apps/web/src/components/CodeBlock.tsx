"use client";

import { useMemo, useState } from "react";
import {
  parseCadSpecBlock,
  parseChartSpecBlock,
  triggerFileDownload,
} from "@/lib/ai-cad-chart-engine";
import { SduInteractiveCadViewer, SduInteractiveChart } from "./AiEngineeringWidgets";
import { Icon } from "./Icon";

const DOWNLOADABLE_LANGS: Record<string, { ext: string; label: string; mime: string }> = {
  dxf: { ext: "dxf", label: "Tải file AutoCAD (.DXF)", mime: "application/dxf;charset=utf-8" },
  scr: { ext: "scr", label: "Tải AutoCAD Script (.SCR)", mime: "text/plain;charset=utf-8" },
  stl: { ext: "stl", label: "Tải file 3D (.STL)", mime: "model/stl;charset=utf-8" },
  obj: { ext: "obj", label: "Tải file 3D (.OBJ)", mime: "model/obj;charset=utf-8" },
  scad: { ext: "scad", label: "Tải mã OpenSCAD (.SCAD)", mime: "text/plain;charset=utf-8" },
  openscad: { ext: "scad", label: "Tải mã OpenSCAD (.SCAD)", mime: "text/plain;charset=utf-8" },
  svg: { ext: "svg", label: "Tải ảnh Vector (.SVG)", mime: "image/svg+xml;charset=utf-8" },
  csv: { ext: "csv", label: "Tải bảng số liệu (.CSV)", mime: "text/csv;charset=utf-8" },
};

/**
 * Fenced code in an AI answer:
 * - Automatically renders interactive SDU Charts (`sdu-chart` / `chart`)
 * - Automatically renders interactive 2D AutoCAD Blueprint + 3D Orbit Viewer (`sdu-cad` / `cad` / `sdu-3d`)
 * - Provides 1-click file download for `.dxf`, `.stl`, `.obj`, `.scad`, `.scr`, `.svg`, `.csv` code blocks.
 */
export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [showRawSource, setShowRawSource] = useState(false);
  const normLang = (language || "").trim().toLowerCase();

  const chartSpec = useMemo(() => {
    if (normLang === "sdu-chart" || normLang === "chart") {
      return parseChartSpecBlock(code);
    }
    if (normLang === "json" && code.includes('"labels"') && code.includes('"series"')) {
      return parseChartSpecBlock(code);
    }
    return null;
  }, [code, normLang]);

  const cadSpec = useMemo(() => {
    if (normLang === "sdu-cad" || normLang === "cad" || normLang === "sdu-3d" || normLang === "3d") {
      return parseCadSpecBlock(code);
    }
    if (normLang === "json" && code.includes('"part"') && (code.includes("spur_gear") || code.includes("stepped_shaft") || code.includes("flange_coupling") || code.includes("ball_bearing") || code.includes("hex_bolt") || code.includes("l_bracket") || code.includes("pulley"))) {
      return parseCadSpecBlock(code);
    }
    return null;
  }, [code, normLang]);

  if (chartSpec && !showRawSource) {
    return (
      <div className="aw-visual-block">
        <SduInteractiveChart spec={chartSpec} />
        <div className="aw-visual-source-bar">
          <button type="button" onClick={() => setShowRawSource(true)}>
            Xem cấu hình JSON gốc
          </button>
        </div>
      </div>
    );
  }

  if (cadSpec && !showRawSource) {
    return (
      <div className="aw-visual-block">
        <SduInteractiveCadViewer initialSpec={cadSpec} />
        <div className="aw-visual-source-bar">
          <button type="button" onClick={() => setShowRawSource(true)}>
            Xem thông số kỹ thuật JSON gốc
          </button>
        </div>
      </div>
    );
  }

  const dlMeta = DOWNLOADABLE_LANGS[normLang];

  return (
    <figure className="md-code">
      <figcaption>
        <span>{language || "code"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(chartSpec || cadSpec) && showRawSource && (
            <button type="button" onClick={() => setShowRawSource(false)}>
              <Icon name="sparkle" /> Mở lại chế độ Trực quan 2D/3D
            </button>
          )}
          {dlMeta && (
            <button
              type="button"
              onClick={() =>
                triggerFileDownload(`sdu-ai-export-${Date.now()}.${dlMeta.ext}`, code, dlMeta.mime)
              }
            >
              <Icon name="file" /> {dlMeta.label}
            </button>
          )}
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
        </div>
      </figcaption>
      <pre><code>{code}</code></pre>
    </figure>
  );
}
