"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { DemoBanner, Empty, PageTitle, Section } from "@/components/portal/Parts";
import { clock, initialRequests, longDay, money, serviceTypes, useDemoState, type ServiceRequest } from "@/lib/portal-demo";

const statusLabel: Record<ServiceRequest["status"], { text: string; chip: string }> = {
  received: { text: "Đã tiếp nhận", chip: "submitted" },
  processing: { text: "Đang xử lý", chip: "soon" },
  ready: { text: "Đã có kết quả, nhận tại phòng Một cửa", chip: "reviewed" },
};

function ServicesContent() {
  const searchParams = useSearchParams();
  const [now] = useState(Date.now);
  const [requests, setRequests] = useDemoState("services", () => initialRequests(now));
  const [chosen, setChosen] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState(1);
  const [status, setStatus] = useState("");
  const type = serviceTypes.find((item) => item.id === chosen);

  useEffect(() => {
    const qType = searchParams.get("type");
    const qPurpose = searchParams.get("purpose");
    if (qType && serviceTypes.some((item) => item.id === qType)) {
      setChosen(qType);
    }
    if (qPurpose) {
      setPurpose(qPurpose);
    }
  }, [searchParams]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!type || !purpose.trim()) return;
    setRequests((value) => [
      { id: `req-${Date.now()}`, type: type.id, purpose: `${purpose.trim()} (${copies} bản)`, at: new Date().toISOString(), status: "received" },
      ...value,
    ]);
    setStatus(`Đã gửi yêu cầu ${type.name}.`);
    setChosen(null);
    setPurpose("");
    setCopies(1);
  }

  return (
    <>
      <DemoBanner />
      <PageTitle title="Thủ tục một cửa" lead="Gửi yêu cầu giấy tờ trực tuyến, nhận kết quả tại phòng Một cửa, nhà A1 cơ sở 1." />

      <div className="pt-service-grid">
        {serviceTypes.map((item) => (
          <button
            key={item.id}
            type="button"
            className="pt-service"
            aria-pressed={chosen === item.id}
            onClick={() => setChosen(chosen === item.id ? null : item.id)}
          >
            <span className="icon-box"><Icon name="file" /></span>
            <strong>{item.name}</strong>
            <span>{item.about}</span>
            <small>{item.days} ngày làm việc · {item.fee ? money(item.fee) : "Miễn phí"}</small>
          </button>
        ))}
      </div>

      {type && (
        <Section title={`Yêu cầu: ${type.name}`} icon="pen">
          <form className="pt-form" onSubmit={submit}>
            <label className="field">
              Mục đích sử dụng
              <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} required maxLength={300} rows={3} placeholder="Ví dụ: bổ sung hồ sơ vay vốn sinh viên" />
            </label>
            <label className="field pt-copies">
              Số bản
              <input type="number" min={1} max={10} value={copies} onChange={(event) => setCopies(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} />
            </label>
            <p className="pt-muted">
              Thời gian xử lý {type.days} ngày làm việc. {type.fee ? `Lệ phí ${money(type.fee * copies)}, nộp khi nhận.` : "Không mất phí."}
            </p>
            <div className="pt-form-actions">
              <button className="button button-primary" type="submit" disabled={!purpose.trim()}>Gửi yêu cầu</button>
              <button className="button button-quiet" type="button" onClick={() => setChosen(null)}>Huỷ</button>
            </div>
          </form>
        </Section>
      )}

      <Section title="Yêu cầu của tôi" icon="clock">
        {requests.length ? (
          <ul className="pt-list">
            {requests.map((request) => {
              const label = statusLabel[request.status];
              return (
                <li key={request.id} className="pt-request">
                  <div>
                    <h4>{serviceTypes.find((item) => item.id === request.type)?.name ?? "Yêu cầu"}</h4>
                    <p className="pt-muted">{request.purpose}</p>
                    <p className="pt-muted">Gửi lúc {clock(request.at)}, {longDay(request.at)}</p>
                  </div>
                  <span className={`chip ${label.chip}`}>{label.text}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon="file" title="Chưa có yêu cầu nào" text="Chọn một loại giấy tờ phía trên để gửi yêu cầu." />
        )}
      </Section>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesContent />
    </Suspense>
  );
}
