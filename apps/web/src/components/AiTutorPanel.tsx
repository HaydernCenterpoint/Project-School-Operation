"use client";

import type {
  AiTutorCitationDetail,
  AiTutorConsent,
  AiTutorResponse,
  ApiClass,
} from "@sao-do/contracts";
import Image from "next/image";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AcademicApiError,
  academicRequest,
} from "@/lib/academic-client";

const maxQuestionLength = 2_000;

type Props = {
  classes: ApiClass[];
  initialClassId: string;
  token: string;
};

type Phase =
  | "idle"
  | "loading"
  | "answered"
  | "abstained"
  | "error"
  | "quota";

export function AiTutorPanel({ classes, initialClassId, token }: Props) {
  const [consent, setConsent] = useState<AiTutorConsent | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [question, setQuestion] = useState("");
  const [validationError, setValidationError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AiTutorResponse | null>(null);
  const [requestError, setRequestError] = useState("");
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(
    null,
  );
  const [citationDetail, setCitationDetail] =
    useState<AiTutorCitationDetail | null>(null);
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationError, setCitationError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const unavailableState = useRef<HTMLDivElement>(null);
  const contextVersion = useRef(0);
  const consentRequestVersion = useRef(0);
  const tutorRequestController = useRef<AbortController | null>(null);
  const citationRequestController = useRef<AbortController | null>(null);
  const classContextKey = classes.map((item) => item.id).join("|");
  const contextClassId = classes.some((item) => item.id === initialClassId)
    ? initialClassId
    : (classes[0]?.id ?? "");

  const loadConsent = useCallback(async () => {
    if (!token) return;
    const requestVersion = ++consentRequestVersion.current;
    setConsentLoading(true);
    setConsentError("");
    try {
      const value = await academicRequest<AiTutorConsent>(
        "/api/ai/consent",
        token,
      );
      if (requestVersion !== consentRequestVersion.current) return;
      setConsent(value);
    } catch {
      if (requestVersion !== consentRequestVersion.current) return;
      setConsent(null);
      setConsentError(
        "Chưa thể kiểm tra trạng thái Trợ giảng AI. Vui lòng thử lại sau.",
      );
    } finally {
      if (requestVersion === consentRequestVersion.current) {
        setConsentLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const nextContextVersion = contextVersion.current + 1;
    contextVersion.current = nextContextVersion;
    consentRequestVersion.current += 1;
    tutorRequestController.current?.abort();
    tutorRequestController.current = null;
    citationRequestController.current?.abort();
    citationRequestController.current = null;
    queueMicrotask(() => {
      if (contextVersion.current !== nextContextVersion) return;
      setConsent(null);
      setConsentLoading(true);
      setConsentSaving(false);
      setAgreementChecked(false);
      setConsentError("");
      setSelectedClassId(contextClassId);
      setQuestion("");
      setValidationError("");
      setPhase("idle");
      setResult(null);
      setRequestError("");
      setDailyRemaining(null);
      setExpandedCitationId(null);
      setCitationDetail(null);
      setCitationLoading(false);
      setCitationError("");
    });
  }, [classContextKey, contextClassId, token]);

  useEffect(
    () => () => {
      contextVersion.current += 1;
      consentRequestVersion.current += 1;
      tutorRequestController.current?.abort();
      citationRequestController.current?.abort();
    },
    [],
  );

  useEffect(() => {
    queueMicrotask(() => void loadConsent());
  }, [classContextKey, contextClassId, loadConsent]);

  useEffect(() => {
    if (
      phase === "answered" ||
      phase === "abstained" ||
      phase === "error" ||
      phase === "quota"
    ) {
      resultHeading.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (!consentLoading && consent && !consent.tutorEnabled) {
      unavailableState.current?.focus();
    }
  }, [consent, consentLoading]);

  const effectiveClassId = classes.some(
    (item) => item.id === selectedClassId,
  )
    ? selectedClassId
    : classes.some((item) => item.id === initialClassId)
      ? initialClassId
      : (classes[0]?.id ?? "");

  function resetResult() {
    citationRequestController.current?.abort();
    citationRequestController.current = null;
    setPhase("idle");
    setResult(null);
    setRequestError("");
    setValidationError("");
    setExpandedCitationId(null);
    setCitationDetail(null);
    setCitationLoading(false);
    setCitationError("");
  }

  function closeCitationDetail() {
    citationRequestController.current?.abort();
    citationRequestController.current = null;
    setExpandedCitationId(null);
    setCitationDetail(null);
    setCitationLoading(false);
    setCitationError("");
  }

  async function loadCitationDetail(citationId: string) {
    const requestContextVersion = contextVersion.current;
    citationRequestController.current?.abort();
    const requestController = new AbortController();
    citationRequestController.current = requestController;
    setExpandedCitationId(citationId);
    setCitationDetail(null);
    setCitationLoading(true);
    setCitationError("");
    try {
      const value = await academicRequest<AiTutorCitationDetail>(
        `/api/ai/citations/${encodeURIComponent(citationId)}?classId=${encodeURIComponent(effectiveClassId)}`,
        token,
        { signal: requestController.signal },
      );
      if (
        requestContextVersion !== contextVersion.current ||
        citationRequestController.current !== requestController
      ) {
        return;
      }
      if (value.id !== citationId) {
        throw new Error("Citation response did not match the request.");
      }
      setCitationDetail(value);
    } catch (error) {
      if (
        requestContextVersion !== contextVersion.current ||
        citationRequestController.current !== requestController ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      setCitationError(
        "Chưa thể mở trích dẫn này. Hãy thử lại hoặc chọn một nguồn khác.",
      );
    } finally {
      if (citationRequestController.current === requestController) {
        citationRequestController.current = null;
        setCitationLoading(false);
      }
    }
  }

  function toggleCitationDetail(citationId: string) {
    if (expandedCitationId === citationId) {
      closeCitationDetail();
      return;
    }
    void loadCitationDetail(citationId);
  }

  async function updateConsent(granted: boolean) {
    if (!consent) return;
    const requestContextVersion = contextVersion.current;
    setConsentSaving(true);
    setConsentError("");
    try {
      const value = await academicRequest<AiTutorConsent>(
        "/api/ai/consent",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            granted,
            policyVersion: consent.currentPolicyVersion,
          }),
        },
      );
      if (requestContextVersion !== contextVersion.current) return;
      setConsent(value);
      setAgreementChecked(false);
      setQuestion("");
      setDailyRemaining(null);
      resetResult();
    } catch (error) {
      if (requestContextVersion !== contextVersion.current) return;
      if (
        error instanceof AcademicApiError &&
        error.code === "policy_changed"
      ) {
        await loadConsent();
        if (requestContextVersion !== contextVersion.current) return;
        setConsentError(
          "Chính sách đã thay đổi. Hãy đọc lại thông tin trước khi đồng ý.",
        );
      } else {
        setConsentError(
          granted
            ? "Chưa thể lưu đồng ý. Vui lòng thử lại."
            : "Chưa thể rút lại đồng ý. Vui lòng thử lại.",
        );
      }
    } finally {
      if (requestContextVersion === contextVersion.current) {
        setConsentSaving(false);
      }
    }
  }

  async function askTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tutorRequestController.current) return;
    const requestContextVersion = contextVersion.current;
    const trimmedQuestion = question.trim();
    if (!effectiveClassId) {
      setValidationError("Hãy chọn một lớp học.");
      return;
    }
    if (!trimmedQuestion) {
      setValidationError("Hãy nhập câu hỏi.");
      return;
    }
    if (trimmedQuestion.length > maxQuestionLength) {
      setValidationError("Câu hỏi không được vượt quá 2.000 ký tự.");
      return;
    }

    setValidationError("");
    setRequestError("");
    setResult(null);
    closeCitationDetail();
    const requestController = new AbortController();
    tutorRequestController.current = requestController;
    setPhase("loading");
    try {
      const value = await academicRequest<AiTutorResponse>(
        "/api/ai/tutor",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            requestId: globalThis.crypto.randomUUID(),
            classId: effectiveClassId,
            question: trimmedQuestion,
          }),
          signal: requestController.signal,
        },
      );
      if (requestContextVersion !== contextVersion.current) return;
      setResult(value);
      setDailyRemaining(value.dailyRemaining);
      setPhase(value.status);
    } catch (error) {
      if (requestContextVersion !== contextVersion.current) return;
      if (error instanceof Error && error.name === "AbortError") {
        setRequestError(
          "Đã hủy chờ câu trả lời. Lượt đã giữ có thể vẫn được tính.",
        );
        setPhase("error");
        return;
      }
      if (error instanceof AcademicApiError) {
        if (error.code === "consent_required") {
          await loadConsent();
          if (requestContextVersion !== contextVersion.current) return;
          setConsentError(
            "Bạn cần đồng ý theo chính sách hiện hành trước khi đặt câu hỏi.",
          );
          setPhase("idle");
          return;
        }
        if (error.code === "quota_exceeded") {
          setDailyRemaining(0);
          setPhase("quota");
          return;
        }
        if (error.code === "ai_unavailable") {
          setConsent((current) =>
            current ? { ...current, tutorEnabled: false } : current,
          );
          setPhase("idle");
          return;
        }
      }
      setRequestError(
        "Câu hỏi vẫn được giữ để bạn kiểm tra và gửi lại.",
      );
      setPhase("error");
    } finally {
      if (tutorRequestController.current === requestController) {
        tutorRequestController.current = null;
      }
    }
  }

  const quotaExhausted = dailyRemaining === 0;
  const busy = phase === "loading";
  const disabled = busy || quotaExhausted;

  return (
    <section
      aria-labelledby="tutor-title"
      className="academic-section tutor-section"
      id="tutor"
    >
      <div className="section-heading tutor-heading">
        <div>
          <h2 id="tutor-title">
            Trợ giảng
            <Image
              alt=""
              aria-hidden="true"
              className="tutor-inline-logo"
              height={38}
              src="/sao-do-logo.png"
              width={38}
            />
            AI
          </h2>
          <p>Nhận câu trả lời dựa trên tài liệu của lớp học.</p>
        </div>
        {dailyRemaining !== null && (
          <p className="tutor-quota" role="status">
            Còn {dailyRemaining} lượt hôm nay
          </p>
        )}
      </div>

      {consentLoading ? (
        <div className="tutor-state" role="status">
          <span className="spinner" />
          <div>
            <strong>Đang kiểm tra quyền sử dụng…</strong>
            <p>Máy chủ đang xác minh chính sách và trạng thái đồng ý.</p>
          </div>
        </div>
      ) : !consent ? (
        <div className="tutor-state tutor-state-locked">
          <div>
            <strong>Trợ giảng AI đang tạm dừng</strong>
            <p>{consentError}</p>
          </div>
          <button
            className="button button-quiet"
            onClick={() => void loadConsent()}
            type="button"
          >
            Kiểm tra lại
          </button>
        </div>
      ) : !consent.tutorEnabled ? (
        <div
          aria-label="Trợ giảng AI đang tạm dừng. Tính năng này hiện chưa được trường bật."
          aria-live="assertive"
          className="tutor-state tutor-state-locked"
          ref={unavailableState}
          role="status"
          tabIndex={-1}
        >
          <div>
            <strong>Trợ giảng AI đang tạm dừng</strong>
            <p>Tính năng này hiện chưa được trường bật.</p>
          </div>
          {consent.granted && (
            <button
              className="tutor-inline-action"
              disabled={consentSaving}
              onClick={() => void updateConsent(false)}
              type="button"
            >
              {consentSaving ? "Đang cập nhật…" : "Rút lại đồng ý"}
            </button>
          )}
        </div>
      ) : !consent.granted ? (
        <div className="tutor-consent">
          <div>
            <h3>Trước khi bắt đầu</h3>
            <p>
              Trợ giảng AI gửi câu hỏi và phần tài liệu liên quan tới dịch vụ
              AI được trường phê duyệt. Không nhập thông tin cá nhân hoặc dữ
              liệu nhạy cảm.
            </p>
            <small>
              Phiên bản chính sách: {consent.currentPolicyVersion}
            </small>
          </div>
          <label className="tutor-consent-check">
            <input
              checked={agreementChecked}
              onChange={(event) => setAgreementChecked(event.target.checked)}
              type="checkbox"
            />
            <span>
              Tôi đồng ý sử dụng dữ liệu này để nhận câu trả lời.
            </span>
          </label>
          {consentError && (
            <p className="tutor-error" role="alert">
              {consentError}
            </p>
          )}
          <button
            className="button button-primary"
            disabled={!agreementChecked || consentSaving}
            onClick={() => void updateConsent(true)}
            type="button"
          >
            {consentSaving ? "Đang lưu đồng ý…" : "Đồng ý và tiếp tục"}
          </button>
        </div>
      ) : !classes.length ? (
        <div className="tutor-state">
          <strong>
            Bạn cần được phân quyền ít nhất một lớp để dùng Trợ giảng AI.
          </strong>
        </div>
      ) : (
        <>
          <div className="tutor-consent-summary">
            <span>
              Đã đồng ý theo chính sách {consent.currentPolicyVersion}
            </span>
            <button
              className="tutor-inline-action"
              disabled={consentSaving || busy}
              onClick={() => void updateConsent(false)}
              type="button"
            >
              {consentSaving ? "Đang cập nhật…" : "Rút lại đồng ý"}
            </button>
          </div>

          <div className="tutor-layout">
            <form className="tutor-form" onSubmit={askTutor} ref={formRef}>
              <label className="tutor-field">
                <span>Lớp học</span>
                <select
                  disabled={disabled}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value);
                    setQuestion("");
                    resetResult();
                  }}
                  value={effectiveClassId}
                >
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="tutor-field" htmlFor="tutor-question">
                <span>Câu hỏi</span>
                <textarea
                  aria-describedby="tutor-question-help tutor-question-count tutor-question-error"
                  aria-invalid={Boolean(validationError)}
                  disabled={disabled}
                  id="tutor-question"
                  maxLength={maxQuestionLength}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    setValidationError("");
                  }}
                  placeholder="Ví dụ: Vì sao chuẩn hoá dữ liệu giúp giảm dư thừa?"
                  rows={7}
                  value={question}
                />
              </label>
              <div className="tutor-question-meta">
                <span id="tutor-question-help">
                  Chỉ trả lời từ tài liệu của lớp đã chọn.
                </span>
                <span id="tutor-question-count">
                  {question.length}/{maxQuestionLength}
                </span>
              </div>
              <p className="tutor-error" id="tutor-question-error" role="alert">
                {validationError}
              </p>

              {quotaExhausted ? (
                <div className="permission-note">
                  <strong>Đã hết lượt hỏi hôm nay.</strong>
                  <span>
                    Bạn chưa thể gửi thêm câu hỏi theo hạn mức của trường.
                  </span>
                </div>
              ) : (
                <button
                  className="button button-primary"
                  disabled={busy}
                  type="submit"
                >
                  {busy
                    ? "Đang tìm trong tài liệu lớp…"
                    : "Hỏi Trợ giảng AI"}
                </button>
              )}
            </form>

            <aside className="tutor-context" aria-label="Nguyên tắc trả lời">
              <strong>Câu trả lời phải có nguồn</strong>
              <p>
                Trợ giảng chỉ dùng các đoạn tài liệu được cấp quyền trong lớp
                bạn chọn.
              </p>
              <ul>
                <li>Không lưu lịch sử trò chuyện.</li>
                <li>Không tự thực hiện hành động thay bạn.</li>
                <li>Không đủ bằng chứng thì từ chối trả lời.</li>
              </ul>
            </aside>
          </div>

          <div
            aria-busy={busy}
            className={`tutor-output tutor-output-${phase}`}
          >
            {phase === "idle" && (
              <div className="tutor-output-empty">
                <strong>Câu trả lời có nguồn sẽ xuất hiện tại đây.</strong>
                <p>Hãy chọn lớp và đặt một câu hỏi cụ thể.</p>
              </div>
            )}
            {phase === "loading" && (
              <div className="tutor-output-empty">
                <span className="spinner" />
                <strong role="status">Đang tìm trong tài liệu lớp…</strong>
                <button
                  className="button button-quiet"
                  onClick={() => tutorRequestController.current?.abort()}
                  type="button"
                >
                  Hủy yêu cầu
                </button>
              </div>
            )}
            {phase === "answered" && result?.answer && (
              <>
                <h3 ref={resultHeading} tabIndex={-1}>
                  Câu trả lời
                </h3>
                <p className="tutor-answer">{result.answer}</p>
                <h4>Nguồn đã sử dụng</h4>
                <ol className="tutor-citations">
                  {result.citations.map((citation) => (
                    <li key={citation.id}>
                      <button
                        aria-controls={`tutor-citation-${citation.id}`}
                        aria-expanded={expandedCitationId === citation.id}
                        className="tutor-citation-trigger"
                        onClick={() => toggleCitationDetail(citation.id)}
                        type="button"
                      >
                        <strong>{citation.title}</strong>
                        <span>
                          {citation.sourceName}
                          {citation.pageNumber
                            ? ` · Trang ${citation.pageNumber}`
                            : ""}
                        </span>
                        <span className="tutor-citation-action">
                          {expandedCitationId === citation.id
                            ? "Đóng trích dẫn"
                            : "Xem trích dẫn"}
                        </span>
                      </button>
                      {expandedCitationId === citation.id && (
                        <div
                          className="tutor-citation-detail"
                          id={`tutor-citation-${citation.id}`}
                        >
                          {citationLoading && (
                            <p role="status">Đang mở trích dẫn…</p>
                          )}
                          {citationError && (
                            <>
                              <p role="alert">{citationError}</p>
                              <button
                                className="tutor-inline-action"
                                onClick={() =>
                                  void loadCitationDetail(citation.id)
                                }
                                type="button"
                              >
                                Thử mở lại
                              </button>
                            </>
                          )}
                          {citationDetail?.id === citation.id && (
                            <>
                              <blockquote>{citationDetail.excerpt}</blockquote>
                              <button
                                className="tutor-inline-action"
                                onClick={closeCitationDetail}
                                type="button"
                              >
                                Đóng trích dẫn
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {phase === "abstained" && (
              <div>
                <h3 ref={resultHeading} tabIndex={-1}>
                  Chưa đủ tài liệu để trả lời
                </h3>
                <p>
                  Tài liệu của lớp chưa có đủ thông tin cho câu hỏi này. Hãy
                  hỏi cụ thể hơn hoặc trao đổi với giảng viên.
                </p>
              </div>
            )}
            {phase === "error" && (
              <div>
                <h3 ref={resultHeading} tabIndex={-1}>
                  Chưa thể nhận câu trả lời
                </h3>
                <p>{requestError}</p>
                <div className="tutor-output-actions">
                  <button
                    className="button button-primary"
                    onClick={() => formRef.current?.requestSubmit()}
                    type="button"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            )}
            {phase === "quota" && (
              <div>
                <h3 ref={resultHeading} tabIndex={-1}>
                  Đã hết lượt hỏi hôm nay
                </h3>
                <p>
                  Bạn chưa thể gửi thêm câu hỏi theo hạn mức của trường.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
