"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import { initials } from "@/lib/format";
import {
  attendanceRecords,
  buildEditableDossierTemplates,
  clubs,
  conduct,
  courses,
  gpa,
  initialClubs,
  initialProfileUpdates,
  objectiveObservations,
  portfolioCompetencies,
  portfolioProjects,
  profile,
  program,
  semester,
  standing,
  terms,
  total,
  useDemoState,
  type EditableDossierTemplate,
  type ProfileUpdateProposal,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

type LensMode = "all" | "advisor" | "employer" | "self";

type SampleArchetype = {
  id: string;
  shortLabel: string;
  badge: string;
  name: string;
  gpa: string;
  conduct: number;
  attendance: string;
  composite: number;
  scores: number[];
  summary: string;
  keyTakeaway: string;
};

const sampleArchetypes: SampleArchetype[] = [
  {
    id: "arch-current",
    shortLabel: "Chuẩn Khoa CNTT",
    badge: "Chuẩn đầu ra Khoa CNTT",
    name: "Đối sánh với chuẩn năng lực năm 3 ngành Công nghệ phần mềm",
    gpa: "3.00",
    conduct: 80,
    attendance: "90.0%",
    composite: 82,
    scores: [80, 85, 90, 80, 75, 85],
    summary:
      "Vượt chuẩn đầu ra giai đoạn năm 3 ở 5/6 chỉ số (Thực hành +3, Chuyên cần +5, Rèn luyện +2, Ngoại ngữ +11, Học thuật +4). Chỉ số Sẵn sàng nghề nghiệp hiện đạt 79/85.",
    keyTakeaway:
      "Hoàn thành đồ án học phần IT3040, IT3090 đúng tiến độ và giữ điểm Toán rời rạc (MI1140) từ 7.5 trở lên để đạt trọn vẹn cả 6 trục chuẩn đầu ra.",
  },
  {
    id: "arch-fullstack",
    shortLabel: "Mẫu Thực tập IT",
    badge: "Hồ sơ mẫu · Thực tập Doanh nghiệp",
    name: "Mẫu sinh viên đỗ thực tập Kỹ thuật phần mềm học kỳ 5",
    gpa: "3.38",
    conduct: 85,
    attendance: "96.0%",
    composite: 90,
    scores: [86, 94, 92, 85, 88, 92],
    summary:
      "Hồ sơ mẫu nhóm sinh viên trúng tuyển thực tập sớm có điểm thực hành phòng Lab 94/100, tối thiểu 3 dự án cá nhân có kiểm thử tự động và đọc hiểu tài liệu tiếng Anh.",
    keyTakeaway:
      "Khoảng cách tổng hợp hiện là -4 điểm (86 vs 90). Nền tảng OOP, SQL và Tiếng Anh B1 đã tương đương; cần đóng gói mã nguồn dự án và xuất Mẫu 01-CVTT bên dưới.",
  },
  {
    id: "arch-scholar",
    shortLabel: "Mẫu Học bổng KKHT",
    badge: "Hồ sơ mẫu · Học bổng loại Xuất sắc",
    name: "Mẫu sinh viên đạt Học bổng Khuyến khích học tập (Top 5% khóa)",
    gpa: "3.72",
    conduct: 91,
    attendance: "99.0%",
    composite: 93,
    scores: [95, 92, 98, 91, 90, 90],
    summary:
      "Duy trì điểm A ở cả nhóm môn Toán đại cương lẫn Lập trình chuyên ngành, không có tiết vắng không phép và tham gia ít nhất 1 đề tài nghiên cứu cấp Khoa.",
    keyTakeaway:
      "Cần thu hẹp độ lệch 2.1 điểm (hệ 10) giữa nhóm môn Toán lý thuyết và nhóm môn lập trình, đồng thời tích lũy thêm 8 điểm rèn luyện học thuật.",
  },
  {
    id: "arch-fivegood",
    shortLabel: "Mẫu SV 5 Tốt",
    badge: "Hồ sơ mẫu · Sinh viên 5 Tốt",
    name: "Mẫu hồ sơ đạt danh hiệu Sinh viên 5 Tốt cấp Trường",
    gpa: "3.45",
    conduct: 94,
    attendance: "98.0%",
    composite: 91,
    scores: [88, 86, 95, 94, 92, 89],
    summary:
      "Đáp ứng đồng thời 5 tiêu chí: Đạo đức (ĐRL ≥ 90), Học tập (GPA ≥ 3.2), Thể lực (GDTC đạt A), Tình nguyện (≥ 2 hoạt động/năm) và Hội nhập (Ngoại ngữ B1).",
    keyTakeaway:
      "Đã đạt chuẩn Học tập (3.22), Thể lực (GDTC 8.7) và Hội nhập (Tiếng Anh 8.9). Cần cộng thêm 8 điểm rèn luyện và xuất Mẫu 02-HBKK để nộp xét duyệt.",
  },
];

function RadarHexagon({
  axes,
  benchmarkScores,
  benchmarkLabel,
}: {
  axes: typeof portfolioCompetencies;
  benchmarkScores: number[];
  benchmarkLabel: string;
}) {
  const size = 296;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 100;
  const rings = [0.25, 0.5, 0.75, 1];

  const pointAt = (index: number, pct: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
    const r = radius * (pct / 100);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (radius + 28) * Math.cos(angle),
      labelY: cy + (radius + 20) * Math.sin(angle),
    };
  };

  const toPolygon = (values: number[]) =>
    values
      .map((v, idx) => {
        const pt = pointAt(idx, v);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(" ");

  const studentPoly = toPolygon(axes.map((a) => a.studentScore));
  const cohortPoly = toPolygon(axes.map((a) => a.cohortAvg));
  const targetPoly = toPolygon(benchmarkScores);

  return (
    <div className="pf-radar-wrap">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="pf-radar-svg"
        role="img"
        aria-label="Biểu đồ đối sánh 6 trục năng lực"
      >
        {rings.map((r) => {
          const pts = axes
            .map((_, idx) => {
              const p = pointAt(idx, r * 100);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" ");
          return <polygon key={r} points={pts} className="pf-radar-ring" />;
        })}

        {axes.map((axis, idx) => {
          const outer = pointAt(idx, 100);
          return (
            <g key={axis.id}>
              <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} className="pf-radar-axis" />
              <text
                x={outer.labelX}
                y={outer.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pf-radar-label"
              >
                {axis.shortLabel}
              </text>
            </g>
          );
        })}

        <polygon points={cohortPoly} className="pf-radar-poly is-cohort" />
        <polygon points={targetPoly} className="pf-radar-poly is-target" />
        <polygon points={studentPoly} className="pf-radar-poly is-student" />

        {axes.map((axis, idx) => {
          const pt = pointAt(idx, axis.studentScore);
          return (
            <circle key={axis.id} cx={pt.x} cy={pt.y} r={3.5} className="pf-radar-dot">
              <title>{`${axis.label}: ${axis.studentScore}/100 (TB lớp ${axis.cohortAvg} · Mẫu ${benchmarkScores[idx] ?? axis.targetBenchmark})`}</title>
            </circle>
          );
        })}
      </svg>

      <div className="pf-radar-legend" aria-label="Chú giải biểu đồ">
        <span>
          <i className="is-student" aria-hidden="true" /> Bạn
        </span>
        <span>
          <i className="is-target" aria-hidden="true" /> {benchmarkLabel}
        </span>
        <span>
          <i className="is-cohort" aria-hidden="true" /> TB lớp DK13
        </span>
      </div>
    </div>
  );
}

export default function StudentPortfolioPage() {
  const router = useRouter();
  const { data, avatarUrl, account, accounts } = useStudent();
  const formStudioRef = useRef<HTMLDivElement>(null);

  const studentIdentity = useMemo(() => {
    if (account.role !== "teacher") return account;
    return accounts.find((a) => a.role === "class_student") ?? account;
  }, [account, accounts]);

  const [lens, setLens] = useState<LensMode>("all");
  const [archetypeId, setArchetypeId] = useState<string>("arch-current");
  const [joinedClubs] = useDemoState("clubs", () => initialClubs);
  const [, setProposals] = useDemoState<ProfileUpdateProposal[]>(
    "profile-updates",
    () => initialProfileUpdates,
  );

  const selectedArchetype =
    sampleArchetypes.find((a) => a.id === archetypeId) ?? sampleArchetypes[0]!;

  const allGradeRows = useMemo(() => terms.flatMap((term) => term.rows), []);
  const overallGpa = useMemo(() => gpa(allGradeRows), [allGradeRows]);
  const standingText = standing(overallGpa.value);
  const earnedCredits = useMemo(
    () => allGradeRows.filter((r) => total(r) >= 4).reduce((sum, r) => sum + r.credits, 0),
    [allGradeRows],
  );
  const currentCredits = useMemo(
    () => courses.reduce((sum, c) => sum + c.credits, 0),
    [],
  );

  const totalAttended = useMemo(
    () => attendanceRecords.reduce((sum, r) => sum + r.attendedPeriods, 0),
    [],
  );
  const totalPeriods = useMemo(
    () => attendanceRecords.reduce((sum, r) => sum + r.totalPeriods, 0),
    [],
  );
  const attendancePct = totalPeriods
    ? ((totalAttended / totalPeriods) * 100).toFixed(1)
    : "100.0";

  const baseTemplates = useMemo(
    () =>
      buildEditableDossierTemplates({
        displayName: studentIdentity.displayName,
        code: studentIdentity.code,
        email: studentIdentity.email,
        phone: studentIdentity.phone,
        cohortClass: studentIdentity.cohortClass,
        department: studentIdentity.department,
        advisorName: studentIdentity.advisorName,
        gpaValue: overallGpa.value.toFixed(2),
        standingLabel: standingText,
        earnedCredits,
        requiredCredits: program.requiredCredits,
        conductScore: conduct.score,
        conductRank: conduct.rank,
        attendancePct,
      }),
    [
      attendancePct,
      earnedCredits,
      overallGpa.value,
      standingText,
      studentIdentity.advisorName,
      studentIdentity.code,
      studentIdentity.cohortClass,
      studentIdentity.department,
      studentIdentity.displayName,
      studentIdentity.email,
      studentIdentity.phone,
    ],
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-internship-cv");
  const [customOverrides, setCustomOverrides] = useDemoState<Record<string, Record<string, string>>>(
    "portfolio-form-drafts",
    () => ({}),
  );
  const [bannerNotice, setBannerNotice] = useState<string>("");

  if (!data) return null;

  const activeTemplate: EditableDossierTemplate =
    baseTemplates.find((tpl) => tpl.id === selectedTemplateId) ?? baseTemplates[0]!;

  const activeDraftValues: Record<string, string> = {
    ...Object.fromEntries(activeTemplate.fields.map((f) => [f.key, f.value])),
    ...(customOverrides[activeTemplate.id] ?? {}),
  };

  function updateDraftField(key: string, nextValue: string) {
    setCustomOverrides((prev) => ({
      ...prev,
      [activeTemplate.id]: {
        ...(prev[activeTemplate.id] ?? {}),
        [key]: nextValue,
      },
    }));
  }

  function resetCurrentDraft() {
    setCustomOverrides((prev) => {
      const next = { ...prev };
      delete next[activeTemplate.id];
      return next;
    });
    setBannerNotice(`Đã khôi phục dữ liệu gốc từ hệ thống cho ${activeTemplate.code}`);
  }

  function openTemplateInStudio(templateId: string, customPatch?: Record<string, string>) {
    setSelectedTemplateId(templateId);
    if (customPatch) {
      setCustomOverrides((prev) => ({
        ...prev,
        [templateId]: {
          ...(prev[templateId] ?? {}),
          ...customPatch,
        },
      }));
    }
    setBannerNotice(
      `Đã nạp dữ liệu sang ${
        baseTemplates.find((t) => t.id === templateId)?.code ?? templateId
      } để chỉnh sửa`,
    );
    setTimeout(() => {
      formStudioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function handleSaveAndRoute(event: FormEvent) {
    event.preventDefault();

    if (activeTemplate.id === "tpl-profile-correction") {
      const cat = (activeDraftValues.category as ProfileUpdateProposal["category"]) || "Hồ sơ cá nhân";
      const fieldLabel = activeDraftValues.fieldLabel || "Thông tin hồ sơ sinh viên";
      const oldValue = activeDraftValues.oldValue || "Dữ liệu hiện tại";
      const newValue = activeDraftValues.newValue || "";
      const reason = activeDraftValues.reason || "Đề xuất cập nhật từ Hồ sơ của bạn";

      const newProposal: ProfileUpdateProposal = {
        id: `pup-${Date.now()}`,
        category: cat,
        fieldLabel,
        oldValue,
        newValue,
        reason,
        submittedAt: new Date().toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Đang chờ duyệt",
      };
      setProposals((prev) => [newProposal, ...prev]);

      const params = new URLSearchParams({
        from: "portfolio",
        category: cat,
        field: fieldLabel,
        old: oldValue,
        new: newValue,
        reason,
      });
      router.push(`/student/profile-update?${params.toString()}` as Route);
      return;
    }

    if (activeTemplate.id === "tpl-onestop-service") {
      const params = new URLSearchParams({
        from: "portfolio",
        type: activeDraftValues.serviceType || "svc-enrol",
        purpose: activeDraftValues.purpose || "",
      });
      router.push(`/student/services?${params.toString()}` as Route);
      return;
    }

    setBannerNotice(`Đã lưu bản chỉnh sửa ${activeTemplate.code} vào bộ nhớ trình duyệt`);
  }

  function exportFormAsWordDoc() {
    const rowsHtml = activeTemplate.fields
      .map(
        (field) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #ccc;font-weight:bold;width:32%;vertical-align:top;background:#f9f5f0;">${field.label}</td>
            <td style="padding:8px 12px;border:1px solid #ccc;white-space:pre-line;">${(
              activeDraftValues[field.key] ?? ""
            )
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</td>
          </tr>`,
      )
      .join("");

    const docHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${activeTemplate.code} - ${studentIdentity.displayName}</title>
</head>
<body style="font-family:'Be Vietnam Pro',system-ui,sans-serif;font-size:12pt;line-height:1.5;color:#111;max-width:760px;margin:24px auto;">
  <div style="text-align:center;margin-bottom:18px;">
    <strong>TRƯỜNG ĐẠI HỌC SAO ĐỎ · CỔNG HỌC TẬP SINH VIÊN</strong><br/>
    <span>Mã biểu mẫu: ${activeTemplate.code} · Hồ sơ sinh viên</span>
    <h2 style="margin:12px 0 4px;">${activeTemplate.title}</h2>
    <p style="margin:0;">Kính gửi: ${activeTemplate.recipient}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tbody>${rowsHtml}</tbody>
  </table>
  <p style="text-align:right;margin-top:28px;">
    Chí Linh, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}<br/>
    <strong>Người lập biểu mẫu</strong><br/><br/><br/>
    ${studentIdentity.displayName} (${studentIdentity.code})
  </p>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTemplate.code.toLowerCase().replace(/\s+/g, "-")}-${studentIdentity.code}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải tệp ${activeTemplate.code}.doc`);
  }

  function exportFormAsJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      templateCode: activeTemplate.code,
      templateTitle: activeTemplate.title,
      recipient: activeTemplate.recipient,
      student: {
        code: studentIdentity.code,
        name: studentIdentity.displayName,
        cohortClass: studentIdentity.cohortClass,
        department: studentIdentity.department,
        gpa: overallGpa.value,
        standing: standingText,
        conductScore: conduct.score,
        attendancePct: Number(attendancePct),
      },
      formValues: activeDraftValues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ho-so-${studentIdentity.code}-${activeTemplate.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBannerNotice(`Đã tải tệp JSON cho ${activeTemplate.code}`);
  }

  async function copyFormText() {
    const lines = [
      `${activeTemplate.code} — ${activeTemplate.title}`,
      `Kính gửi: ${activeTemplate.recipient}`,
      ...activeTemplate.fields.map(
        (field) => `${field.label}: ${activeDraftValues[field.key] ?? ""}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setBannerNotice("Đã sao chép nội dung biểu mẫu");
    } catch {
      setBannerNotice("Không thể truy cập bộ nhớ tạm trên trình duyệt này");
    }
  }

  const visibleObservations = objectiveObservations.filter(
    (item) => lens === "all" || item.perspective === lens,
  );

  const compositeIndex = Math.round(
    portfolioCompetencies.reduce((sum, item) => sum + item.studentScore, 0) /
      portfolioCompetencies.length,
  );
  const cohortComposite = Math.round(
    portfolioCompetencies.reduce((sum, item) => sum + item.cohortAvg, 0) /
      portfolioCompetencies.length,
  );

  const activeClubsList = clubs.filter((c) => joinedClubs.includes(c.id));

  return (
    <>
      <DemoBanner />

      <PageTitle
        title="Hồ sơ của bạn"
        lead="Đối sánh kết quả học tập, chuyên cần và rèn luyện với mặt bằng khóa DK13, trích xuất trực tiếp sang biểu mẫu học vụ"
      >
        <div className="pf-top-actions">
          <button
            type="button"
            className="button button-primary button-sm"
            onClick={() => openTemplateInStudio("tpl-internship-cv")}
          >
            <Icon name="pen" /> Xuất sang biểu mẫu chỉnh sửa
          </button>
          <button
            type="button"
            className="button button-outline button-sm"
            onClick={() => window.print()}
          >
            <Icon name="file" /> In hồ sơ A4
          </button>
        </div>
      </PageTitle>

      {bannerNotice && (
        <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đồng bộ biểu mẫu</strong>
            <p>{bannerNotice}</p>
          </div>
          <button
            className="button button-quiet button-xs"
            type="button"
            onClick={() => setBannerNotice("")}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Top Split: Student Dossier Sheet (Left) + One Bright Moment: 6-Axis Radar & Archetype Switcher (Right) */}
      <div className="pf-hero-grid">
        <article className="pf-dossier-card" aria-label="Hồ sơ định vị sinh viên">
          <header className="pf-dossier-head">
            <div className="pf-dossier-identity">
              <div className="pf-dossier-avatar" aria-hidden="true">
                {avatarUrl && account.role !== "teacher" ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  <span>{initials(studentIdentity.displayName)}</span>
                )}
              </div>
              <div className="pf-dossier-meta">
                <span className="pf-record-id">
                  Hồ sơ học vụ · <code>22SDU.CNTT.{studentIdentity.code.slice(-4)}</code>
                </span>
                <h2>{studentIdentity.displayName}</h2>
                <p className="pf-dossier-sub">
                  MSSV <code>{studentIdentity.code}</code> · Lớp {studentIdentity.cohortClass} ·{" "}
                  {studentIdentity.department}
                </p>
              </div>
            </div>

            <div className="pf-score-stamp">
              <span className="pf-score-label">Chỉ số tổng hợp</span>
              <strong className="pf-score-value">
                {compositeIndex}
                <small>/100</small>
              </strong>
              <span className="pf-score-delta">
                +{compositeIndex - cohortComposite} vs TB khóa ({cohortComposite})
              </span>
            </div>
          </header>

          <dl className="pf-key-metrics">
            <div>
              <dt>GPA tích lũy (Hệ 4)</dt>
              <dd>
                <strong>{overallGpa.value.toFixed(2)}</strong>
                <span className="pf-delta is-good">+0.39 vs lớp (2.83)</span>
                <small>Xếp loại {standingText}</small>
              </dd>
            </div>
            <div>
              <dt>Tín chỉ hoàn thành</dt>
              <dd>
                <strong>
                  {earnedCredits}/{program.requiredCredits}
                </strong>
                <span className="pf-delta">+{currentCredits} TC kỳ này</span>
                <small>{semester.short}</small>
              </dd>
            </div>
            <div>
              <dt>Tỷ lệ chuyên cần</dt>
              <dd>
                <strong>{attendancePct}%</strong>
                <span className="pf-delta is-good">+6.3% vs lớp (91.2%)</span>
                <small>
                  {totalAttended}/{totalPeriods} tiết có mặt
                </small>
              </dd>
            </div>
            <div>
              <dt>Điểm rèn luyện</dt>
              <dd>
                <strong>{conduct.score}</strong>
                <span className="pf-delta is-good">+6 vs lớp (76)</span>
                <small>
                  Xếp loại {conduct.rank} · {activeClubsList.length} CLB
                </small>
              </dd>
            </div>
          </dl>

          <div className="pf-objective-quote">
            <div className="pf-quote-head">
              <strong>Đối sánh với {selectedArchetype.badge}</strong>
              <code>
                Mẫu GPA {selectedArchetype.gpa} · ĐRL {selectedArchetype.conduct} · Chỉ số{" "}
                {selectedArchetype.composite}/100
              </code>
            </div>
            <p>{selectedArchetype.summary}</p>
            <p className="pf-quote-action">
              <strong>Trọng tâm tiếp theo:</strong> {selectedArchetype.keyTakeaway}
            </p>
          </div>

          <footer className="pf-quick-export-bar" aria-label="Chọn nhanh biểu mẫu cần xuất">
            <span className="pf-quick-export-label">Xuất sang form:</span>
            <div className="pf-export-links">
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-internship-cv")}
              >
                Mẫu 01 · CV Thực tập
              </button>
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-scholarship")}
              >
                Mẫu 02 · Học bổng & SV 5 Tốt
              </button>
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-profile-correction")}
              >
                Mẫu 03 · Sửa dữ liệu gốc
              </button>
              <button
                type="button"
                className="pf-export-btn"
                onClick={() => openTemplateInStudio("tpl-onestop-service")}
              >
                Mẫu 04 · Xin giấy xác nhận
              </button>
            </div>
          </footer>
        </article>

        <section className="pf-radar-card" aria-label="Biểu đồ đối sánh 6 trục năng lực">
          <div className="pf-radar-card-head">
            <div>
              <span className="pf-section-eyebrow">Định vị khách quan 6 trục</span>
              <h3>So sánh với mặt bằng lớp & hồ sơ mẫu</h3>
            </div>
            <code className="pf-rank-tag">Top 18% {studentIdentity.cohortClass}</code>
          </div>

          <div className="pf-archetype-segmented" role="tablist" aria-label="Chọn hồ sơ mẫu đối sánh">
            {sampleArchetypes.map((arch) => {
              const active = arch.id === selectedArchetype.id;
              return (
                <button
                  key={arch.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`pf-seg-btn${active ? " is-active" : ""}`}
                  onClick={() => setArchetypeId(arch.id)}
                >
                  {arch.shortLabel}
                </button>
              );
            })}
          </div>

          <RadarHexagon
            axes={portfolioCompetencies}
            benchmarkScores={selectedArchetype.scores}
            benchmarkLabel={selectedArchetype.shortLabel}
          />
        </section>
      </div>

      {/* Main Split: 6-Axis Quantitative Comparison Table (2/3 width) + Multi-Lens Review Notes (1/3 width) */}
      <div className="pf-analysis-split">
        <Section
          title="Đối sánh định lượng 6 trục năng lực"
          action={<span className="reg-table-meta">Thang 100 · Đối chiếu {selectedArchetype.shortLabel}</span>}
        >
          <div className="pf-comp-list">
            {portfolioCompetencies.map((comp, idx) => {
              const targetVal = selectedArchetype.scores[idx] ?? comp.targetBenchmark;
              const diff = comp.studentScore - comp.cohortAvg;
              const vsTarget = comp.studentScore - targetVal;
              return (
                <div key={comp.id} className="pf-comp-item">
                  <div className="pf-comp-title-row">
                    <strong>{comp.label}</strong>
                    <div className="pf-comp-figures">
                      <span className="pf-comp-score">{comp.studentScore}</span>
                      <span className="pf-comp-slash">/100</span>
                      <span className={`pf-comp-delta ${diff >= 0 ? "is-good" : "is-warn"}`}>
                        {diff >= 0 ? `+${diff}` : diff} vs lớp ({comp.cohortAvg})
                      </span>
                      <span className="pf-comp-target">
                        Mẫu {targetVal} ({vsTarget >= 0 ? `+${vsTarget}` : vsTarget})
                      </span>
                    </div>
                  </div>

                  <div className="pf-comp-bar-track" aria-hidden="true">
                    <div
                      className="pf-comp-bar-fill"
                      style={{ width: `${comp.studentScore}%` }}
                    />
                    <div
                      className="pf-comp-marker is-cohort"
                      style={{ left: `${comp.cohortAvg}%` }}
                      title={`Trung bình lớp: ${comp.cohortAvg}`}
                    />
                    <div
                      className="pf-comp-marker is-target"
                      style={{ left: `${targetVal}%` }}
                      title={`${selectedArchetype.shortLabel}: ${targetVal}`}
                    />
                  </div>

                  <div className="pf-comp-details">
                    <p>{comp.evidence}</p>
                    <p className="pf-comp-hint">{comp.improvementHint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          title="Nhận xét khách quan đa chiều"
          action={
            <div className="pf-lens-tabs" role="group" aria-label="Lọc góc nhìn">
              <button
                type="button"
                aria-pressed={lens === "all"}
                onClick={() => setLens("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                aria-pressed={lens === "advisor"}
                onClick={() => setLens("advisor")}
              >
                Cố vấn
              </button>
              <button
                type="button"
                aria-pressed={lens === "employer"}
                onClick={() => setLens("employer")}
              >
                Doanh nghiệp
              </button>
              <button
                type="button"
                aria-pressed={lens === "self"}
                onClick={() => setLens("self")}
              >
                Điểm mù
              </button>
            </div>
          }
        >
          <div className="pf-obs-stack">
            {visibleObservations.map((obs) => (
              <article key={obs.id} className={`pf-obs-card is-${obs.tone}`}>
                <header className="pf-obs-head">
                  <span className="pf-obs-badge">{obs.badge}</span>
                  <code className="pf-obs-metric">{obs.metric}</code>
                </header>
                <h4>{obs.title}</h4>
                <p>{obs.summary}</p>
                <footer className="pf-obs-foot">
                  <span>Nguồn: {obs.evidenceRef}</span>
                  <button
                    type="button"
                    className="pf-inline-link"
                    onClick={() =>
                      openTemplateInStudio(
                        obs.suggestedFormId,
                        obs.suggestedField
                          ? {
                              category: obs.suggestedField.category,
                              fieldLabel: obs.suggestedField.fieldLabel,
                              oldValue: obs.suggestedField.oldValue,
                              newValue: obs.suggestedField.newValue,
                              reason: obs.suggestedField.reason,
                            }
                          : undefined,
                      )
                    }
                  >
                    Đưa vào form chỉnh sửa <Icon name="arrow" />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </Section>
      </div>

      {/* Verified Coursework & Projects Table */}
      <Section
        title="Học phần thực hành & dự án môn học đã kiểm chứng"
        action={
          <button
            type="button"
            className="button button-outline button-xs"
            onClick={() => openTemplateInStudio("tpl-internship-cv")}
          >
            Trích xuất vào CV Thực tập
          </button>
        }
      >
        <div className="ad-table-wrap">
          <table className="ad-table pf-project-table">
            <thead>
              <tr>
                <th scope="col">Học phần</th>
                <th scope="col">Đề tài / Dự án thực hành</th>
                <th scope="col">Vai trò & Công nghệ</th>
                <th scope="col">Kết quả</th>
                <th scope="col">Giảng viên xác nhận</th>
              </tr>
            </thead>
            <tbody>
              {portfolioProjects.map((proj) => (
                <tr key={proj.id}>
                  <td className="ad-code">
                    <strong>{proj.courseCode}</strong>
                    <div className="pt-muted">{proj.semester}</div>
                  </td>
                  <td>
                    <strong>{proj.title}</strong>
                    <div className="pt-muted">{proj.highlight}</div>
                  </td>
                  <td>
                    <div>{proj.role}</div>
                    <div className="pf-inline-tags">{proj.stack.join(" · ")}</div>
                  </td>
                  <td className="ad-code">
                    <strong>{proj.score}</strong>
                  </td>
                  <td>{proj.verifiedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Master-Detail Editable Form Studio */}
      <div ref={formStudioRef} id="xuat-bieu-mau">
        <Section
          title="Xuất hồ sơ sang biểu mẫu cần thiết để chỉnh sửa"
          action={
            <span className="reg-table-meta">
              Dữ liệu tự động điền từ hệ thống học vụ · Chỉnh sửa trực tiếp trước khi tải hoặc gửi duyệt
            </span>
          }
        >
          <div className="pf-studio-layout">
            <aside className="pf-template-rail" role="tablist" aria-label="Danh sách biểu mẫu">
              {baseTemplates.map((tpl) => {
                const active = tpl.id === activeTemplate.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`pf-rail-item${active ? " is-active" : ""}`}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                  >
                    <div className="pf-rail-top">
                      <code>{tpl.code}</code>
                      <span>{tpl.category}</span>
                    </div>
                    <strong>{tpl.title}</strong>
                  </button>
                );
              })}
            </aside>

            <div className="pf-studio-shell">
              <header className="pf-studio-head">
                <div>
                  <div className="pf-studio-code-row">
                    <code>{activeTemplate.code}</code>
                    <span>· {activeTemplate.category}</span>
                    {customOverrides[activeTemplate.id] && (
                      <span className="pf-draft-indicator">Đã chỉnh sửa</span>
                    )}
                  </div>
                  <h3>{activeTemplate.title}</h3>
                  <p className="pt-muted">Nơi nhận: {activeTemplate.recipient}</p>
                </div>

                <div className="pf-studio-toolbar">
                  <button
                    type="button"
                    className="button button-outline button-xs"
                    onClick={exportFormAsWordDoc}
                  >
                    <Icon name="file" /> Tải Word (.doc)
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-xs"
                    onClick={exportFormAsJson}
                  >
                    <Icon name="code" /> Tải JSON
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-xs"
                    onClick={() => void copyFormText()}
                  >
                    <Icon name="copy" /> Sao chép
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-xs"
                    onClick={resetCurrentDraft}
                  >
                    Khôi phục gốc
                  </button>
                </div>
              </header>

              <form className="pf-studio-form" onSubmit={handleSaveAndRoute}>
                <div className="pf-studio-grid">
                  {activeTemplate.fields.map((field) => {
                    const val = activeDraftValues[field.key] ?? "";
                    return (
                      <label
                        key={field.key}
                        className={`field${field.wide ? " is-wide" : ""}`}
                      >
                        <span>{field.label}</span>
                        {field.multiline ? (
                          <textarea
                            rows={4}
                            value={val}
                            onChange={(e) => updateDraftField(field.key, e.target.value)}
                          />
                        ) : (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => updateDraftField(field.key, e.target.value)}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="pf-studio-actions">
                  <div className="pf-studio-primary-actions">
                    <button type="submit" className="button button-primary">
                      <span>
                        {activeTemplate.id === "tpl-profile-correction"
                          ? "Chuyển sang Form Đề xuất cập nhật hồ sơ"
                          : activeTemplate.id === "tpl-onestop-service"
                            ? "Chuyển sang Form Thủ tục Một cửa"
                            : "Lưu bản chỉnh sửa"}
                      </span>
                    </button>

                    <Link
                      href={
                        `/student/profile-update?from=portfolio&category=${encodeURIComponent(
                          activeDraftValues.category || "Hồ sơ cá nhân",
                        )}&field=${encodeURIComponent(
                          activeDraftValues.fieldLabel || activeTemplate.title,
                        )}&old=${encodeURIComponent(
                          activeDraftValues.oldValue ||
                            `GPA ${overallGpa.value.toFixed(2)} · ${studentIdentity.cohortClass}`,
                        )}&new=${encodeURIComponent(
                          activeDraftValues.newValue || activeDraftValues.objectivePitch || "",
                        )}&reason=${encodeURIComponent(
                          activeDraftValues.reason ||
                            `Trích xuất từ ${activeTemplate.code} (${activeTemplate.title})`,
                        )}` as Route
                      }
                      className="button button-outline"
                    >
                      Mở trong Phiếu đề xuất chỉnh sửa HSSV
                    </Link>

                    <Link
                      href={
                        `/student/services?from=portfolio&type=${encodeURIComponent(
                          activeDraftValues.serviceType || "svc-enrol",
                        )}&purpose=${encodeURIComponent(
                          activeDraftValues.purpose ||
                            `Xác nhận hồ sơ năng lực sinh viên (${activeTemplate.title}) - GPA ${overallGpa.value.toFixed(2)}`,
                        )}` as Route
                      }
                      className="button button-outline"
                    >
                      Mở trong Thủ tục Một cửa
                    </Link>
                  </div>

                  <Link href="/student/account" className="button button-quiet">
                    Xem hồ sơ gốc ({profile.education.length + profile.personal.length} mục)
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
