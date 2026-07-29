"use client";

import type {
  CommunityModerationAction,
  CommunityReport,
  CommunitySpace,
} from "@sao-do/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { academicRequest } from "@/lib/academic-client";

type ModerationResponse = { reports: CommunityReport[] };
type SpacesResponse = { spaces: CommunitySpace[] };

const actionLabels: Record<CommunityModerationAction, string> = {
  dismiss: "Bỏ qua báo cáo",
  escalate: "Chuyển cấp xử lý",
  hide: "Ẩn nội dung",
  resolve: "Đánh dấu đã xử lý",
};

const reasonLabels: Record<CommunityReport["reason"], string> = {
  dangerous: "Nội dung nguy hiểm",
  harassment: "Quấy rối",
  hate: "Thù ghét",
  misinformation: "Thông tin sai lệch",
  other: "Khác",
  spam: "Tin rác",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ModerationQueue({ token }: { token: string }) {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [spaces, setSpaces] = useState<CommunitySpace[]>([]);
  const [slowModes, setSlowModes] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState("");
  const [notice, setNotice] = useState("");
  const actionKeys = useRef<
    Record<string, { id: string; payload: string }>
  >({});

  const load = useCallback(async (clearNotice = true) => {
    if (!token) return false;
    setLoading(true);
    if (clearNotice) setNotice("");
    try {
      const [moderation, availableSpaces] = await Promise.all([
        academicRequest<ModerationResponse>(
          "/api/community/moderation",
          token,
        ),
        academicRequest<SpacesResponse>("/api/community/spaces", token),
      ]);
      setReports(moderation.reports);
      setSpaces(availableSpaces.spaces);
      setSlowModes(
        Object.fromEntries(
          availableSpaces.spaces.map((space) => [
            space.id,
            space.slowModeSeconds,
          ]),
        ),
      );
      return true;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể tải hàng đợi kiểm duyệt.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function setSlowMode(space: CommunitySpace) {
    setMutatingId(space.id);
    setNotice("");
    try {
      const response = await academicRequest<{ slowModeSeconds: number }>(
        `/api/community/spaces/${space.id}/slow-mode`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ seconds: slowModes[space.id] ?? 0 }),
        },
      );
      setSlowModes((current) => ({
        ...current,
        [space.id]: response.slowModeSeconds,
      }));
      setNotice(`Đã cập nhật nhịp đăng cho ${space.name}.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật nhịp đăng.",
      );
    } finally {
      setMutatingId("");
    }
  }

  async function moderate(
    reportId: string,
    action: CommunityModerationAction,
  ) {
    const key = `${reportId}:${action}`;
    const payload = JSON.stringify({
      action,
      note: notes[reportId]?.trim() || null,
    });
    const previous = actionKeys.current[key];
    const actionId =
      previous?.payload === payload ? previous.id : crypto.randomUUID();
    actionKeys.current[key] = { id: actionId, payload };
    setMutatingId(reportId);
    setNotice("");
    try {
      await academicRequest(
        `/api/community/moderation/reports/${reportId}/actions`,
        token,
        {
          method: "POST",
          headers: { "Idempotency-Key": actionId },
          body: payload,
        },
      );
      setNotes((current) => ({ ...current, [reportId]: "" }));
      const refreshed = await load(false);
      if (refreshed) delete actionKeys.current[key];
      setNotice(
        refreshed
          ? "Đã ghi nhận quyết định kiểm duyệt."
          : "Đã ghi nhận quyết định, nhưng chưa thể làm mới hàng đợi.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật báo cáo.",
      );
    } finally {
      setMutatingId("");
    }
  }

  return (
    <section className="academic-section moderation-section" id="moderation">
      <div className="section-heading">
        <div>
          <h2>Hàng đợi kiểm duyệt</h2>
        </div>
        <p>{reports.length} báo cáo cần theo dõi</p>
      </div>

      <div className="status-region" aria-live="polite" aria-atomic="true">
        {notice && (
          <div className="portal-notice" role="status">
            <span>{notice}</span>
            {!mutatingId && (
              <button type="button" onClick={() => void load()}>
                Tải lại
              </button>
            )}
          </div>
        )}
      </div>

      {!loading && spaces.length > 0 && (
        <div
          className="moderation-list slow-mode-list"
          aria-label="Thiết lập nhịp đăng bài"
        >
          <article className="slow-mode-panel">
            <div className="submission-heading">
              <div>
                <h3>Nhịp đăng bài</h3>
                <p className="permission-note">
                  Giãn cách tin nhắn theo từng không gian để giảm spam.
                </p>
              </div>
            </div>
            <div className="slow-mode-grid">
              {spaces.map((space) => (
                <div className="slow-mode-control" key={space.id}>
                  <label htmlFor={`slow-mode-${space.id}`}>{space.name}</label>
                  <div className="slow-mode-fields">
                    <select
                      disabled={Boolean(mutatingId)}
                      id={`slow-mode-${space.id}`}
                      value={slowModes[space.id] ?? 0}
                      onChange={(event) =>
                        setSlowModes((current) => ({
                          ...current,
                          [space.id]: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Tắt</option>
                      <option value={10}>10 giây</option>
                      <option value={30}>30 giây</option>
                      <option value={60}>60 giây</option>
                      <option value={120}>2 phút</option>
                      <option value={300}>5 phút</option>
                    </select>
                    <button
                      aria-label={`Lưu nhịp đăng cho ${space.name}`}
                      className="button button-quiet"
                      disabled={Boolean(mutatingId)}
                      onClick={() => void setSlowMode(space)}
                      type="button"
                    >
                      {mutatingId === space.id ? "Đang lưu…" : "Lưu"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {loading ? (
        <p className="section-loading" role="status">
          Đang tải báo cáo…
        </p>
      ) : reports.length ? (
        <div className="moderation-list">
          {reports.map((report) => (
            <article key={report.id}>
              <div className="submission-heading">
                <div>
                  <span className={`status-chip ${report.status}`}>
                    {report.status === "escalated" ? "Đã chuyển cấp" : "Đang mở"}
                  </span>
                  <h3>{reasonLabels[report.reason]}</h3>
                </div>
                <small>{formatDate(report.createdAt)}</small>
              </div>
              <p className="moderation-evidence">{report.message.text}</p>
              <dl>
                <div>
                  <dt>Người đăng</dt>
                  <dd>{report.message.author.displayName}</dd>
                </div>
                <div>
                  <dt>Người báo cáo</dt>
                  <dd>{report.reporter.displayName}</dd>
                </div>
              </dl>
              {report.detail && (
                <p className="permission-note">Chi tiết: {report.detail}</p>
              )}
              <label>
                Ghi chú quyết định
                <textarea
                  value={notes[report.id] ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                  maxLength={1000}
                  rows={3}
                />
              </label>
              <div className="moderation-actions">
                {(
                  [
                    "dismiss",
                    "hide",
                    "escalate",
                    "resolve",
                  ] as CommunityModerationAction[]
                ).map((action) => (
                  <button
                    className={
                      action === "hide"
                        ? "button button-primary"
                        : "button button-quiet"
                    }
                    disabled={Boolean(mutatingId)}
                    key={action}
                    onClick={() => void moderate(report.id, action)}
                    type="button"
                  >
                    {mutatingId === report.id
                      ? "Đang xử lý…"
                      : actionLabels[action]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <strong>Không có báo cáo đang mở</strong>
          <p>Báo cáo mới trong đúng cơ sở sẽ xuất hiện tại đây.</p>
        </div>
      )}
    </section>
  );
}
