"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  asciiSafe,
  buildCadGeometry,
  type CadPartKind,
  generateAutoCadDxf,
  generateAutoCadScript,
  generateObjMesh,
  generateOpenScadCode,
  generateStlMesh,
  PRESET_CAD_SPECS,
  type SduCadSpec,
  type SduChartSpec,
  type SduChartType,
  triggerFileDownload,
  type Vec3,
} from "@/lib/ai-cad-chart-engine";
import { Icon } from "./Icon";

const CHART_PALETTE = [
  "#e11d48", // Phuong crimson
  "#2563eb", // Engineering blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
];

const PART_LABELS: Record<CadPartKind, string> = {
  spur_gear: "Bánh răng trụ răng thẳng",
  stepped_shaft: "Trục bậc cơ khí",
  flange_coupling: "Khớp nối mặt bích",
  ball_bearing: "Ổ bi đỡ một dãy",
  hex_bolt: "Bu-lông lục giác tiêu chuẩn",
  l_bracket: "Giá đỡ cơ khí chữ L",
  pulley: "Bánh đai thang (Puli)",
};

export function SduInteractiveChart({ spec }: { spec: SduChartSpec }) {
  const [chartType, setChartType] = useState<SduChartType>(spec.type || "bar");
  const [showTable, setShowTable] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allValues = useMemo(
    () => spec.series.flatMap((s) => s.values).filter((v) => Number.isFinite(v)),
    [spec.series],
  );
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const avgVal = allValues.length
    ? allValues.reduce((acc, v) => acc + v, 0) / allValues.length
    : 0;

  const width = 680;
  const height = 320;
  const padLeft = 54;
  const padRight = 28;
  const padTop = 28;
  const padBottom = 54;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  function handleExportCsv() {
    const headers = ["Nhãn", ...spec.series.map((s) => s.name)];
    const rows = spec.labels.map((label, idx) => [
      `"${label.replace(/"/g, '""')}"`,
      ...spec.series.map((s) => String(s.values[idx] ?? 0)),
    ]);
    const csv = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const slug = asciiSafe(spec.title).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sdu-chart";
    triggerFileDownload(`${slug}.csv`, csv, "text/csv;charset=utf-8");
  }

  function handleExportSvg() {
    if (!svgRef.current) return;
    const rawSvg = new XMLSerializer().serializeToString(svgRef.current);
    const slug = asciiSafe(spec.title).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sdu-chart";
    triggerFileDownload(`${slug}.svg`, rawSvg, "image/svg+xml;charset=utf-8");
  }

  function handleExportJson() {
    const slug = asciiSafe(spec.title).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sdu-chart";
    triggerFileDownload(`${slug}.json`, JSON.stringify(spec, null, 2), "application/json;charset=utf-8");
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Number((maxVal * t).toFixed(2)));

  return (
    <div className="aw-eng-card aw-chart-card">
      <div className="aw-eng-head">
        <div className="aw-eng-title-wrap">
          <div className="aw-eng-badges">
            <span className="aw-eng-badge is-primary">
              <Icon name="sparkle" /> SDU AI DataViz · Model SDU 1.3
            </span>
            {spec.unit && <span className="aw-eng-badge">Đơn vị: {spec.unit}</span>}
          </div>
          <h4>{spec.title}</h4>
          {spec.subtitle && <p>{spec.subtitle}</p>}
        </div>
        <div className="aw-eng-mode-tabs" role="group" aria-label="Loại biểu đồ">
          {(
            [
              ["bar", "Cột"],
              ["line", "Đường"],
              ["area", "Miền"],
              ["radar", "Radar"],
              ["pie", "Tròn"],
            ] as [SduChartType, string][]
          ).map(([tKey, tLabel]) => (
            <button
              key={tKey}
              type="button"
              className={chartType === tKey ? "is-active" : ""}
              onClick={() => setChartType(tKey)}
            >
              {tLabel}
            </button>
          ))}
          <button
            type="button"
            className={showTable ? "is-active" : ""}
            onClick={() => setShowTable((v) => !v)}
          >
            Bảng số liệu
          </button>
        </div>
      </div>

      <div className="aw-chart-kpis">
        <div>
          <span>Giá trị cao nhất</span>
          <strong>
            {maxVal.toLocaleString("vi-VN")} {spec.unit ?? ""}
          </strong>
        </div>
        <div>
          <span>Trung bình</span>
          <strong>
            {avgVal.toFixed(2)} {spec.unit ?? ""}
          </strong>
        </div>
        <div>
          <span>Giá trị thấp nhất</span>
          <strong>
            {minVal.toLocaleString("vi-VN")} {spec.unit ?? ""}
          </strong>
        </div>
        <div>
          <span>Số chỉ tiêu</span>
          <strong>
            {spec.labels.length} mục × {spec.series.length} chuỗi
          </strong>
        </div>
      </div>

      <div className="aw-chart-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="aw-chart-svg"
          role="img"
          aria-label={spec.title}
        >
          <rect width={width} height={height} rx={12} fill="#131116" />

          {(chartType === "bar" || chartType === "line" || chartType === "area") && (
            <>
              {/* Grid lines */}
              {yTicks.map((tick, idx) => {
                const y = padTop + plotH - (tick / (maxVal || 1)) * plotH;
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke="rgba(255,255,255,0.09)"
                      strokeDasharray={idx === 0 ? undefined : "4 4"}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="#a1a1aa"
                      fontSize="11"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* X labels */}
              {spec.labels.map((label, i) => {
                const stepW = plotW / Math.max(spec.labels.length, 1);
                const cx = padLeft + stepW * (i + 0.5);
                return (
                  <text
                    key={i}
                    x={cx}
                    y={height - 18}
                    textAnchor="middle"
                    fill={hoverIdx === i ? "#ffffff" : "#d4d4d8"}
                    fontSize="11"
                    fontWeight={hoverIdx === i ? "700" : "500"}
                  >
                    {label.length > 14 ? `${label.slice(0, 13)}…` : label}
                  </text>
                );
              })}

              {chartType === "bar" &&
                spec.labels.map((_, labelIdx) => {
                  const groupW = plotW / Math.max(spec.labels.length, 1);
                  const barW = Math.min(
                    34,
                    (groupW * 0.72) / Math.max(spec.series.length, 1),
                  );
                  const totalBarsW = barW * spec.series.length;
                  const startX = padLeft + groupW * labelIdx + (groupW - totalBarsW) / 2;
                  return (
                    <g
                      key={labelIdx}
                      onMouseEnter={() => setHoverIdx(labelIdx)}
                      onMouseLeave={() => setHoverIdx(null)}
                    >
                      {spec.series.map((s, sIdx) => {
                        const val = s.values[labelIdx] ?? 0;
                        const bh = Math.max(2, (val / (maxVal || 1)) * plotH);
                        const bx = startX + sIdx * barW;
                        const by = padTop + plotH - bh;
                        const color = s.color || CHART_PALETTE[sIdx % CHART_PALETTE.length]!;
                        return (
                          <g key={sIdx}>
                            <rect
                              x={bx}
                              y={by}
                              width={Math.max(4, barW - 3)}
                              height={bh}
                              rx={4}
                              fill={color}
                              opacity={hoverIdx === null || hoverIdx === labelIdx ? 0.92 : 0.45}
                            />
                            <text
                              x={bx + (barW - 3) / 2}
                              y={by - 6}
                              textAnchor="middle"
                              fill="#f4f4f5"
                              fontSize="10"
                              fontWeight="600"
                            >
                              {val}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

              {(chartType === "line" || chartType === "area") &&
                spec.series.map((s, sIdx) => {
                  const color = s.color || CHART_PALETTE[sIdx % CHART_PALETTE.length]!;
                  const stepW = plotW / Math.max(spec.labels.length, 1);
                  const pts = spec.labels.map((_, i) => {
                    const val = s.values[i] ?? 0;
                    const x = padLeft + stepW * (i + 0.5);
                    const y = padTop + plotH - (val / (maxVal || 1)) * plotH;
                    return [x, y, val] as const;
                  });
                  const polylineStr = pts.map(([x, y]) => `${x},${y}`).join(" ");
                  const areaStr =
                    pts.length > 1
                      ? `${pts[0]![0]},${padTop + plotH} ${polylineStr} ${pts[pts.length - 1]![0]},${padTop + plotH}`
                      : "";
                  return (
                    <g key={sIdx}>
                      {chartType === "area" && areaStr && (
                        <polygon points={areaStr} fill={color} opacity={0.18} />
                      )}
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth={2.8}
                        points={polylineStr}
                      />
                      {pts.map(([x, y, val], i) => (
                        <g
                          key={i}
                          onMouseEnter={() => setHoverIdx(i)}
                          onMouseLeave={() => setHoverIdx(null)}
                        >
                          <circle cx={x} cy={y} r={4.5} fill={color} stroke="#131116" strokeWidth={1.5} />
                          <text
                            x={x}
                            y={y - 9}
                            textAnchor="middle"
                            fill="#f4f4f5"
                            fontSize="10"
                            fontWeight="600"
                          >
                            {val}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })}
            </>
          )}

          {chartType === "radar" &&
            (() => {
              const cx = width / 2;
              const cy = height / 2 + 4;
              const radius = Math.min(plotW, plotH) * 0.44;
              const n = Math.max(spec.labels.length, 3);
              return (
                <g>
                  {[0.25, 0.5, 0.75, 1].map((rRatio, rIdx) => {
                    const ringPts = Array.from({ length: n }, (_, i) => {
                      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
                      return `${cx + radius * rRatio * Math.cos(a)},${cy + radius * rRatio * Math.sin(a)}`;
                    }).join(" ");
                    return (
                      <polygon
                        key={rIdx}
                        points={ringPts}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                      />
                    );
                  })}
                  {spec.labels.map((label, i) => {
                    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
                    const lx = cx + (radius + 22) * Math.cos(a);
                    const ly = cy + (radius + 16) * Math.sin(a);
                    return (
                      <g key={i}>
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx + radius * Math.cos(a)}
                          y2={cy + radius * Math.sin(a)}
                          stroke="rgba(255,255,255,0.12)"
                        />
                        <text
                          x={lx}
                          y={ly}
                          textAnchor="middle"
                          fill="#e4e4e7"
                          fontSize="11"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  {spec.series.map((s, sIdx) => {
                    const color = s.color || CHART_PALETTE[sIdx % CHART_PALETTE.length]!;
                    const polyPts = spec.labels
                      .map((_, i) => {
                        const val = s.values[i] ?? 0;
                        const ratio = Math.min(1, Math.max(0, val / (maxVal || 1)));
                        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
                        return `${cx + radius * ratio * Math.cos(a)},${cy + radius * ratio * Math.sin(a)}`;
                      })
                      .join(" ");
                    return (
                      <g key={sIdx}>
                        <polygon
                          points={polyPts}
                          fill={color}
                          fillOpacity={0.22}
                          stroke={color}
                          strokeWidth={2.4}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })()}

          {chartType === "pie" &&
            (() => {
              const primary = spec.series[0]?.values ?? [];
              const total = primary.reduce((acc, v) => acc + Math.max(0, v), 0) || 1;
              const cx = width * 0.36;
              const cy = height / 2;
              const r = Math.min(plotW, plotH) * 0.42;
              let startAngle = -Math.PI / 2;

              return (
                <g>
                  {spec.labels.map((label, i) => {
                    const val = Math.max(0, primary[i] ?? 0);
                    const angle = (val / total) * Math.PI * 2;
                    const endAngle = startAngle + angle;
                    const x1 = cx + r * Math.cos(startAngle);
                    const y1 = cy + r * Math.sin(startAngle);
                    const x2 = cx + r * Math.cos(endAngle);
                    const y2 = cy + r * Math.sin(endAngle);
                    const largeArc = angle > Math.PI ? 1 : 0;
                    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                    const color = CHART_PALETTE[i % CHART_PALETTE.length]!;
                    const pct = ((val / total) * 100).toFixed(1);
                    startAngle = endAngle;
                    return (
                      <g key={i}>
                        <path d={pathData} fill={color} stroke="#131116" strokeWidth={2} />
                        <rect
                          x={width * 0.64}
                          y={44 + i * 28}
                          width={12}
                          height={12}
                          rx={3}
                          fill={color}
                        />
                        <text
                          x={width * 0.64 + 20}
                          y={54 + i * 28}
                          fill="#f4f4f5"
                          fontSize="12"
                        >
                          {label}: {val} ({pct}%)
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
        </svg>
      </div>

      <div className="aw-chart-legend">
        {spec.series.map((s, idx) => (
          <span key={idx} className="aw-chart-legend-item">
            <i
              style={{
                background: s.color || CHART_PALETTE[idx % CHART_PALETTE.length],
              }}
            />
            <strong>{s.name}</strong>
          </span>
        ))}
      </div>

      {showTable && (
        <div className="md-table aw-eng-table">
          <table>
            <thead>
              <tr>
                <th>Chỉ tiêu / Nhãn</th>
                {spec.series.map((s, idx) => (
                  <th key={idx}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.labels.map((label, rIdx) => (
                <tr key={rIdx}>
                  <td>{label}</td>
                  {spec.series.map((s, sIdx) => (
                    <td key={sIdx}>
                      {s.values[rIdx] ?? 0} {spec.unit ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spec.note && <p className="aw-eng-note">{spec.note}</p>}

      <div className="aw-eng-export-bar">
        <span className="aw-eng-export-label">Xuất dữ liệu & biểu đồ:</span>
        <button type="button" className="aw-eng-export-btn is-primary" onClick={handleExportSvg}>
          <Icon name="file" /> Tải Biểu đồ Vector (.SVG)
        </button>
        <button type="button" className="aw-eng-export-btn" onClick={handleExportCsv}>
          <Icon name="list" /> Xuất Excel / CSV (.CSV)
        </button>
        <button type="button" className="aw-eng-export-btn" onClick={handleExportJson}>
          <Icon name="copy" /> Xuất Dữ liệu (.JSON)
        </button>
      </div>
    </div>
  );
}

export function SduInteractiveCadViewer({ initialSpec }: { initialSpec: SduCadSpec }) {
  const [spec, setSpec] = useState<SduCadSpec>(initialSpec);
  const [activeTab, setActiveTab] = useState<"2d" | "3d" | "params">("2d");
  const [renderStyle, setRenderStyle] = useState<"shaded" | "wireframe" | "xray">("shaded");
  const [autoRotate, setAutoRotate] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [showCenter, setShowCenter] = useState(true);
  const [showHidden, setShowHidden] = useState(true);
  const [zoom2D, setZoom2D] = useState(1);
  const [rotation, setRotation] = useState<{ yaw: number; pitch: number }>({
    yaw: 0.65,
    pitch: 0.45,
  });
  const [zoom3D, setZoom3D] = useState(1);
  const [exportStatus, setExportStatus] = useState("");
  const draggingRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blueprintSvgRef = useRef<SVGSVGElement>(null);

  const bundle = useMemo(() => buildCadGeometry(spec), [spec]);

  // Auto-rotate 3D view when active
  useEffect(() => {
    if (activeTab !== "3d" || !autoRotate) return;
    let frameId = 0;
    const step = () => {
      setRotation((prev) => ({ ...prev, yaw: prev.yaw + 0.012 }));
      frameId = window.requestAnimationFrame(step);
    };
    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, autoRotate]);

  // Paint 3D canvas
  useEffect(() => {
    if (activeTab !== "3d") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // CAD 3D Studio dark background gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.65);
    grad.addColorStop(0, "#1c1f2b");
    grad.addColorStop(1, "#0d0f17");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const cy = Math.cos(rotation.yaw);
    const sy = Math.sin(rotation.yaw);
    const cp = Math.cos(rotation.pitch);
    const sp = Math.sin(rotation.pitch);

    const scale = (Math.min(w, h) * 0.36 * zoom3D) / Math.max(bundle.bbox3D.radius, 1);

    const project = (v: Vec3): [number, number, number] => {
      const x1 = v[0] * cy - v[2] * sy;
      const z1 = v[0] * sy + v[2] * cy;
      const y2 = v[1] * cp - z1 * sp;
      const z2 = v[1] * sp + z1 * cp;
      const perspective = 420 / (420 + z2 * 0.35);
      return [w / 2 + x1 * scale * perspective, h / 2 - y2 * scale * perspective, z2];
    };

    // Draw reference 3D axes in bottom-left corner
    const axisOrigin: [number, number] = [56, h - 46];
    const axes: { dir: Vec3; label: string; color: string }[] = [
      { dir: [28, 0, 0], label: "X", color: "#ef4444" },
      { dir: [0, 28, 0], label: "Y", color: "#22c55e" },
      { dir: [0, 0, 28], label: "Z", color: "#3b82f6" },
    ];
    for (const ax of axes) {
      const rx = ax.dir[0] * cy - ax.dir[2] * sy;
      const rz = ax.dir[0] * sy + ax.dir[2] * cy;
      const ry = ax.dir[1] * cp - rz * sp;
      ctx.strokeStyle = ax.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(axisOrigin[0], axisOrigin[1]);
      ctx.lineTo(axisOrigin[0] + rx, axisOrigin[1] - ry);
      ctx.stroke();
      ctx.fillStyle = ax.color;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(ax.label, axisOrigin[0] + rx * 1.25 - 4, axisOrigin[1] - ry * 1.25 + 4);
    }

    // Sort triangles back-to-front (Painter's algorithm)
    const projected = bundle.triangles3D.map((tri) => {
      const pa = project(tri.a);
      const pb = project(tri.b);
      const pc = project(tri.c);
      const depth = (pa[2] + pb[2] + pc[2]) / 3;

      // Rotate normal for directional lighting
      const nx1 = tri.normal[0] * cy - tri.normal[2] * sy;
      const nz1 = tri.normal[0] * sy + tri.normal[2] * cy;
      const ny2 = tri.normal[1] * cp - nz1 * sp;
      const nz2 = tri.normal[1] * sp + nz1 * cp;
      const lightIntensity = Math.max(0.18, Math.min(1, (nx1 * 0.45 + ny2 * 0.65 - nz2 * 0.6) * 0.5 + 0.55));
      return { pa, pb, pc, depth, lightIntensity, group: tri.group };
    });

    projected.sort((a, b) => b.depth - a.depth);

    for (const item of projected) {
      ctx.beginPath();
      ctx.moveTo(item.pa[0], item.pa[1]);
      ctx.lineTo(item.pb[0], item.pb[1]);
      ctx.lineTo(item.pc[0], item.pc[1]);
      ctx.closePath();

      if (renderStyle === "wireframe") {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 0.75;
        ctx.stroke();
      } else {
        const baseR = item.group === "bore" ? 180 : item.group === "hub" ? 96 : 125;
        const baseG = item.group === "bore" ? 85 : item.group === "hub" ? 165 : 195;
        const baseB = item.group === "bore" ? 95 : item.group === "hub" ? 235 : 250;
        const r = Math.round(baseR * item.lightIntensity);
        const g = Math.round(baseG * item.lightIntensity);
        const b = Math.round(baseB * item.lightIntensity);
        ctx.fillStyle =
          renderStyle === "xray" ? `rgba(${r}, ${g}, ${b}, 0.36)` : `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.strokeStyle =
          renderStyle === "xray" ? "rgba(125, 211, 252, 0.35)" : "rgba(15, 23, 42, 0.35)";
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }
    }
  }, [activeTab, bundle, rotation, zoom3D, renderStyle]);

  const slugName =
    asciiSafe(bundle.spec.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "chi-tiet-may-sdu";

  function handleDownloadDxf() {
    const dxf = generateAutoCadDxf(bundle);
    triggerFileDownload(`${slugName}.dxf`, dxf, "application/dxf;charset=utf-8");
    setExportStatus(`Đã xuất bản vẽ AutoCAD: ${slugName}.dxf`);
  }

  function handleDownloadScr() {
    const scr = generateAutoCadScript(bundle);
    triggerFileDownload(`${slugName}.scr`, scr, "text/plain;charset=utf-8");
    setExportStatus(`Đã xuất kịch bản lệnh AutoCAD: ${slugName}.scr`);
  }

  function handleDownloadStl() {
    const stl = generateStlMesh(bundle);
    triggerFileDownload(`${slugName}.stl`, stl, "model/stl;charset=utf-8");
    setExportStatus(`Đã xuất mô hình 3D STL: ${slugName}.stl (${bundle.triangles3D.length} tam giác)`);
  }

  function handleDownloadObj() {
    const obj = generateObjMesh(bundle);
    triggerFileDownload(`${slugName}.obj`, obj, "model/obj;charset=utf-8");
    setExportStatus(`Đã xuất mô hình 3D Wavefront: ${slugName}.obj`);
  }

  function handleDownloadScad() {
    const scad = generateOpenScadCode(bundle);
    triggerFileDownload(`${slugName}.scad`, scad, "text/plain;charset=utf-8");
    setExportStatus(`Đã xuất mã nguồn 3D OpenSCAD: ${slugName}.scad`);
  }

  function handleDownloadSvg() {
    if (!blueprintSvgRef.current) return;
    const svg = new XMLSerializer().serializeToString(blueprintSvgRef.current);
    triggerFileDownload(`${slugName}-blueprint.svg`, svg, "image/svg+xml;charset=utf-8");
    setExportStatus(`Đã xuất bản vẽ kỹ thuật 2D Vector: ${slugName}-blueprint.svg`);
  }

  const { bbox2D } = bundle;
  const vbW = (bbox2D.maxX - bbox2D.minX) / zoom2D;
  const vbH = (bbox2D.maxY - bbox2D.minY) / zoom2D;
  const vbCx = (bbox2D.minX + bbox2D.maxX) / 2;
  const vbCy = (bbox2D.minY + bbox2D.maxY) / 2;

  return (
    <div className="aw-eng-card aw-cad-card">
      <div className="aw-eng-head">
        <div className="aw-eng-title-wrap">
          <div className="aw-eng-badges">
            <span className="aw-eng-badge is-primary">
              <Icon name="sparkle" /> SDU CAD / 3D Engine · Model SDU 1.3
            </span>
            <span className="aw-eng-badge">{PART_LABELS[bundle.spec.part]}</span>
            <span className="aw-eng-badge">{bundle.spec.standard}</span>
          </div>
          <h4>{bundle.spec.name}</h4>
          <p>
            Vật liệu: <strong>{bundle.spec.material}</strong> · Tỷ lệ:{" "}
            <strong>{bundle.spec.scale}</strong> · Đơn vị: <strong>{bundle.spec.unit}</strong> · Lưới
            3D: <strong>{bundle.triangles3D.length} mặt tam giác</strong>
          </p>
        </div>

        <div className="aw-eng-mode-tabs" role="tablist" aria-label="Chế độ xem kỹ thuật">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "2d"}
            className={activeTab === "2d" ? "is-active" : ""}
            onClick={() => setActiveTab("2d")}
          >
            Bản vẽ 2D (AutoCAD / TCVN)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "3d"}
            className={activeTab === "3d" ? "is-active" : ""}
            onClick={() => setActiveTab("3d")}
          >
            Mô hình 3D Tương tác
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "params"}
            className={activeTab === "params" ? "is-active" : ""}
            onClick={() => setActiveTab("params")}
          >
            Chỉnh thông số & Đổi chi tiết
          </button>
        </div>
      </div>

      {/* Quick part switcher bar */}
      <div className="aw-cad-preset-bar">
        <span>Mẫu chi tiết máy tiêu chuẩn:</span>
        {(Object.keys(PRESET_CAD_SPECS) as CadPartKind[]).map((pKey) => (
          <button
            key={pKey}
            type="button"
            className={`aw-cad-preset-chip${bundle.spec.part === pKey ? " is-active" : ""}`}
            onClick={() => setSpec(PRESET_CAD_SPECS[pKey])}
          >
            {PART_LABELS[pKey]}
          </button>
        ))}
      </div>

      {activeTab === "2d" && (
        <div className="aw-cad-stage-wrap">
          <div className="aw-cad-toolbar">
            <label className="aw-cad-check">
              <input
                type="checkbox"
                checked={showDims}
                onChange={(e) => setShowDims(e.target.checked)}
              />
              Kích thước (DIM)
            </label>
            <label className="aw-cad-check">
              <input
                type="checkbox"
                checked={showCenter}
                onChange={(e) => setShowCenter(e.target.checked)}
              />
              Đường tâm (CENTER)
            </label>
            <label className="aw-cad-check">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              Nét khuất (HIDDEN)
            </label>
            <div className="aw-cad-zoom-group">
              <button
                type="button"
                onClick={() => setZoom2D((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
              >
                −
              </button>
              <span>{Math.round(zoom2D * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom2D((z) => Math.min(2.5, Number((z + 0.2).toFixed(2))))}
              >
                +
              </button>
              <button type="button" onClick={() => setZoom2D(1)}>
                1:1
              </button>
            </div>
          </div>

          <svg
            ref={blueprintSvgRef}
            viewBox={`${vbCx - vbW / 2} ${vbCy - vbH / 2} ${vbW} ${vbH}`}
            className="aw-cad-blueprint-svg"
            role="img"
            aria-label={`Bản vẽ kỹ thuật 2D: ${bundle.spec.name}`}
          >
            <defs>
              <pattern id="sdu-cad-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.08)"
                  strokeWidth="0.3"
                />
              </pattern>
            </defs>
            <rect
              x={vbCx - vbW}
              y={vbCy - vbH}
              width={vbW * 2}
              height={vbH * 2}
              fill="#0a1628"
            />
            <rect
              x={vbCx - vbW}
              y={vbCy - vbH}
              width={vbW * 2}
              height={vbH * 2}
              fill="url(#sdu-cad-grid)"
            />

            {/* Circles */}
            {bundle.circles2D.map((c, idx) => {
              if (c.layer === "CENTER" && !showCenter) return null;
              if (c.layer === "HIDDEN" && !showHidden) return null;
              const stroke =
                c.layer === "CENTER"
                  ? "#f43f5e"
                  : c.layer === "HIDDEN"
                    ? "#34d399"
                    : "#f8fafc";
              const dash =
                c.layer === "CENTER"
                  ? "4 1.5 1 1.5"
                  : c.layer === "HIDDEN"
                    ? "2.5 1.8"
                    : undefined;
              return (
                <circle
                  key={idx}
                  cx={c.cx}
                  cy={-c.cy}
                  r={c.r}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={c.layer === "OUTLINE" ? 1.15 : 0.65}
                  strokeDasharray={dash}
                />
              );
            })}

            {/* Lines */}
            {bundle.lines2D.map((l, idx) => {
              if (l.layer === "CENTER" && !showCenter) return null;
              if (l.layer === "HIDDEN" && !showHidden) return null;
              const stroke =
                l.layer === "CENTER"
                  ? "#f43f5e"
                  : l.layer === "HIDDEN"
                    ? "#34d399"
                    : "#f8fafc";
              const dash =
                l.layer === "CENTER"
                  ? "5 1.6 1.2 1.6"
                  : l.layer === "HIDDEN"
                    ? "2.5 1.8"
                    : undefined;
              return (
                <line
                  key={idx}
                  x1={l.x1}
                  y1={-l.y1}
                  x2={l.x2}
                  y2={-l.y2}
                  stroke={stroke}
                  strokeWidth={l.layer === "OUTLINE" ? 1.15 : 0.65}
                  strokeDasharray={dash}
                />
              );
            })}

            {/* Dimensions */}
            {showDims &&
              bundle.dimensions2D.map((dim, idx) => (
                <g key={idx}>
                  <line
                    x1={dim.x1}
                    y1={-dim.y1}
                    x2={dim.x2}
                    y2={-dim.y2}
                    stroke="#38bdf8"
                    strokeWidth={0.65}
                  />
                  <circle cx={dim.x1} cy={-dim.y1} r={1.1} fill="#38bdf8" />
                  <circle cx={dim.x2} cy={-dim.y2} r={1.1} fill="#38bdf8" />
                  <text
                    x={(dim.x1 + dim.x2) / 2}
                    y={-dim.y1 + 5.5}
                    textAnchor="middle"
                    fill="#7dd3fc"
                    fontSize="4.2"
                    fontFamily="monospace"
                  >
                    {dim.text}
                  </text>
                </g>
              ))}
          </svg>

          {/* TCVN Standard Title Block Footer */}
          <div className="aw-cad-titleblock">
            <div>
              <span>ĐƠN VỊ THIẾT KẾ</span>
              <strong>TRƯỜNG ĐẠI HỌC SAO ĐỎ (SDU)</strong>
            </div>
            <div>
              <span>TÊN CHI TIẾT MÁY</span>
              <strong>{bundle.spec.name}</strong>
            </div>
            <div>
              <span>VẬT LIỆU & TIÊU CHUẨN</span>
              <strong>
                {bundle.spec.material} · {bundle.spec.standard}
              </strong>
            </div>
            <div>
              <span>MÔ HÌNH AI & TỶ LỆ</span>
              <strong>
                Model SDU 1.3 (Qwen 3.8) · {bundle.spec.scale} ({bundle.spec.unit})
              </strong>
            </div>
          </div>
        </div>
      )}

      {activeTab === "3d" && (
        <div className="aw-cad-stage-wrap">
          <div className="aw-cad-toolbar">
            <div className="aw-cad-style-group">
              <button
                type="button"
                className={renderStyle === "shaded" ? "is-active" : ""}
                onClick={() => setRenderStyle("shaded")}
              >
                Khối đặc 3D (Shaded)
              </button>
              <button
                type="button"
                className={renderStyle === "wireframe" ? "is-active" : ""}
                onClick={() => setRenderStyle("wireframe")}
              >
                Khung dây (Wireframe)
              </button>
              <button
                type="button"
                className={renderStyle === "xray" ? "is-active" : ""}
                onClick={() => setRenderStyle("xray")}
              >
                Bán trong suốt (X-Ray)
              </button>
            </div>
            <label className="aw-cad-check">
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
              />
              Tự động xoay 360°
            </label>
            <div className="aw-cad-zoom-group">
              <button
                type="button"
                onClick={() => setZoom3D((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              >
                −
              </button>
              <span>{Math.round(zoom3D * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom3D((z) => Math.min(2.4, Number((z + 0.15).toFixed(2))))}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setRotation({ yaw: 0.65, pitch: 0.45 });
                  setZoom3D(1);
                }}
              >
                Góc chuẩn Iso
              </button>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={720}
            height={360}
            className="aw-cad-3d-canvas"
            onMouseDown={(e) => {
              setAutoRotate(false);
              draggingRef.current = { active: true, x: e.clientX, y: e.clientY };
            }}
            onMouseMove={(e) => {
              if (!draggingRef.current.active) return;
              const dx = e.clientX - draggingRef.current.x;
              const dy = e.clientY - draggingRef.current.y;
              draggingRef.current = { active: true, x: e.clientX, y: e.clientY };
              setRotation((prev) => ({
                yaw: prev.yaw + dx * 0.01,
                pitch: Math.max(-1.4, Math.min(1.4, prev.pitch + dy * 0.01)),
              }));
            }}
            onMouseUp={() => {
              draggingRef.current.active = false;
            }}
            onMouseLeave={() => {
              draggingRef.current.active = false;
            }}
          />
          <p className="aw-cad-3d-hint">
            Kéo chuột trái để xoay mô hình 3D theo mọi góc độ · Sẵn sàng xuất lưới kín 3D (.STL / .OBJ) cho máy in 3D, SolidWorks, Blender, Inventor.
          </p>
        </div>
      )}

      {activeTab === "params" && (
        <div className="aw-cad-params-panel">
          <div className="aw-cad-params-grid">
            <label>
              <span>Tên chi tiết bản vẽ</span>
              <input
                type="text"
                value={bundle.spec.name}
                onChange={(e) => setSpec((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label>
              <span>Vật liệu chế tạo</span>
              <input
                type="text"
                value={bundle.spec.material}
                onChange={(e) => setSpec((prev) => ({ ...prev, material: e.target.value }))}
              />
            </label>
            {bundle.spec.part === "spur_gear" && (
              <>
                <label>
                  <span>Mô-đun bánh răng m (mm)</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    max="16"
                    value={bundle.spec.module}
                    onChange={(e) =>
                      setSpec((prev) => ({ ...prev, module: Number(e.target.value) || 2.5 }))
                    }
                  />
                </label>
                <label>
                  <span>Số răng z</span>
                  <input
                    type="number"
                    min="8"
                    max="100"
                    value={bundle.spec.teeth}
                    onChange={(e) =>
                      setSpec((prev) => ({ ...prev, teeth: Number(e.target.value) || 24 }))
                    }
                  />
                </label>
                <label>
                  <span>Bề rộng vành răng b (mm)</span>
                  <input
                    type="number"
                    min="5"
                    max="150"
                    value={bundle.spec.faceWidth}
                    onChange={(e) =>
                      setSpec((prev) => ({ ...prev, faceWidth: Number(e.target.value) || 20 }))
                    }
                  />
                </label>
              </>
            )}
            <label>
              <span>Đường kính lỗ trục / ren d (mm)</span>
              <input
                type="number"
                min="6"
                max="200"
                value={bundle.spec.boreDiameter}
                onChange={(e) =>
                  setSpec((prev) => ({ ...prev, boreDiameter: Number(e.target.value) || 20 }))
                }
              />
            </label>
            {bundle.spec.part !== "spur_gear" && bundle.spec.part !== "stepped_shaft" && (
              <label>
                <span>Đường kính ngoài D (mm)</span>
                <input
                  type="number"
                  min="20"
                  max="400"
                  value={bundle.spec.outerDiameter}
                  onChange={(e) =>
                    setSpec((prev) => ({ ...prev, outerDiameter: Number(e.target.value) || 120 }))
                  }
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Calculated Engineering Specs Grid */}
      <div className="aw-cad-specs-grid">
        {bundle.calculatedSpecs.map((item, idx) => (
          <div key={idx} className="aw-cad-spec-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {exportStatus && (
        <div className="aw-cad-export-toast" role="status">
          <Icon name="check" />
          <span>{exportStatus}</span>
        </div>
      )}

      {/* Export Action Bar */}
      <div className="aw-eng-export-bar">
        <span className="aw-eng-export-label">Xuất file AutoCAD & 3D:</span>
        <button type="button" className="aw-eng-export-btn is-primary" onClick={handleDownloadDxf}>
          <Icon name="file" /> Xuất AutoCAD (.DXF)
        </button>
        <button type="button" className="aw-eng-export-btn is-accent" onClick={handleDownloadStl}>
          <Icon name="sparkle" /> Xuất File 3D (.STL)
        </button>
        <button type="button" className="aw-eng-export-btn" onClick={handleDownloadObj}>
          <Icon name="file" /> Xuất 3D Wavefront (.OBJ)
        </button>
        <button type="button" className="aw-eng-export-btn" onClick={handleDownloadScr}>
          <Icon name="list" /> AutoCAD Script (.SCR)
        </button>
        <button type="button" className="aw-eng-export-btn" onClick={handleDownloadScad}>
          <Icon name="copy" /> Mã 3D OpenSCAD (.SCAD)
        </button>
        <button type="button" className="aw-eng-export-btn" onClick={handleDownloadSvg}>
          <Icon name="file" /> Bản vẽ 2D (.SVG)
        </button>
      </div>
    </div>
  );
}

const DEFAULT_STUDIO_CHART: SduChartSpec = {
  type: "bar",
  title: "Biểu đồ So sánh GPA & Điểm Rèn luyện Sinh viên Lớp DK13-CNTT1",
  subtitle: "Trích xuất trực tiếp từ Hệ thống Bộ nhớ Học sinh AI — Trường Đại học Sao Đỏ",
  unit: "điểm",
  labels: [
    "Nguyễn Văn Minh",
    "Phạm Khánh Linh",
    "Lê Việt Hoàng",
    "Đỗ Thu Trang",
    "Vũ Quốc Bảo",
    "Hoàng Minh Tuấn",
  ],
  series: [
    { name: "GPA hệ 4.0 (quy đổi ×25)", color: "#e11d48", values: [87, 93, 78.8, 88.5, 69.5, 83] },
    { name: "Điểm rèn luyện (/100)", color: "#2563eb", values: [88, 94, 79, 91, 72, 85] },
    { name: "Chuyên cần (%)", color: "#10b981", values: [98, 100, 92, 97, 84, 95] },
  ],
  note: "Có thể chuyển đổi trực tiếp giữa biểu đồ Cột, Đường, Miền, Radar, Tròn hoặc xuất file .SVG / .CSV.",
};

export function SduEngineeringStudioModal({
  open,
  onClose,
  onAskAi,
}: {
  open: boolean;
  onClose: () => void;
  onAskAi: (prompt: string) => void;
}) {
  const [studioTab, setStudioTab] = useState<"cad" | "chart">("cad");

  if (!open) return null;

  return (
    <div
      className="aw-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="aw-memory-modal aw-eng-studio-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aw-eng-studio-title"
      >
        <div className="aw-memory-modal-head">
          <div>
            <div className="aw-memory-head-badges">
              <span className="aw-model-tag">
                <Icon name="sparkle" /> Model SDU 1.3 · Qwen 3.8 Engineering
              </span>
              <span className="aw-memory-count-tag">
                AutoCAD (.DXF / .SCR) · 3D (.STL / .OBJ / .SCAD) · DataViz (.SVG / .CSV)
              </span>
            </div>
            <h2 id="aw-eng-studio-title">
              Xưởng Kỹ thuật CAD / 3D & Biểu đồ Trực quan (SDU AI Studio)
            </h2>
            <p>
              Thiết kế chi tiết máy cơ khí theo tiêu chuẩn TCVN, xoay mô hình 3D trực tiếp, xuất bản vẽ AutoCAD (.DXF) & file in 3D (.STL/.OBJ) hoặc vẽ biểu đồ phân tích dữ liệu.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng cửa sổ"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="aw-eng-studio-switch">
          <button
            type="button"
            className={studioTab === "cad" ? "is-active" : ""}
            onClick={() => setStudioTab("cad")}
          >
            <Icon name="sparkle" /> Thiết kế Chi tiết Máy 2D AutoCAD & Mô hình 3D
          </button>
          <button
            type="button"
            className={studioTab === "chart" ? "is-active" : ""}
            onClick={() => setStudioTab("chart")}
          >
            <Icon name="list" /> Vẽ Biểu đồ Phân tích Dữ liệu (Chart Studio)
          </button>
          <button
            type="button"
            className="aw-eng-ask-ai-btn"
            onClick={() => {
              onClose();
              onAskAi(
                studioTab === "cad"
                  ? "Hãy thiết kế và vẽ chi tiết máy Bánh răng trụ răng thẳng (m=2.5, z=24) kèm tính toán thông số kỹ thuật, bản vẽ 2D AutoCAD (.DXF) và mô hình 3D (.STL)."
                  : "Hãy vẽ biểu đồ so sánh GPA, điểm rèn luyện và tỷ lệ chuyên cần của 6 sinh viên lớp DK13-CNTT1 kèm nhận xét chi tiết.",
              );
            }}
          >
            <Icon name="send" /> Yêu cầu AI vẽ & phân tích trong khung chat
          </button>
        </div>

        <div className="aw-eng-studio-body">
          {studioTab === "cad" ? (
            <SduInteractiveCadViewer initialSpec={PRESET_CAD_SPECS.spur_gear} />
          ) : (
            <SduInteractiveChart spec={DEFAULT_STUDIO_CHART} />
          )}
        </div>
      </div>
    </div>
  );
}
