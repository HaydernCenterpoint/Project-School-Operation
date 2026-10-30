"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import {
  courses,
  creditLimit,
  initialRegistration,
  shortDay,
  clock,
  offerings,
  registrationWindow,
  terms,
  total,
  useDemoState,
} from "@/lib/portal-demo";

const passedCodes = new Set(terms.flatMap((term) => term.rows).filter((row) => total(row) >= 4).map((row) => row.code));

export default function RegistrationPage() {
  const [now] = useState(Date.now);
  const [picked, setPicked] = useDemoState("registration", () => initialRegistration);
  const [status, setStatus] = useState("");
  const period = registrationWindow(now);
  const open = now >= Date.parse(period.opens) && now <= Date.parse(period.closes);
  const current = courses.reduce((sum, item) => sum + item.credits, 0);
  const pickedOfferings = offerings.filter((item) => picked.includes(item.code));
  const extra = pickedOfferings.reduce((sum, item) => sum + item.credits, 0);
  const planned = current + extra;
  const minPct = Math.round((creditLimit.min / creditLimit.max) * 100);
  const currentPct = Math.min(100, Math.round((current / creditLimit.max) * 100));
  const extraPct = Math.min(100 - currentPct, Math.round((extra / creditLimit.max) * 100));

  function toggle(code: string) {
    const offering = offerings.find((item) => item.code === code)!;
    if (picked.includes(code)) {
      setPicked((value) => value.filter((item) => item !== code));
      setStatus(`Đã huỷ đăng ký ${offering.name}`);
    } else {
      setPicked((value) => [...value, code]);
      setStatus(`Đã đăng ký ${offering.name}`);
    }
  }

  return (
    <>
      <DemoBanner />
      <PageTitle title="Đăng ký học phần" lead="Học kỳ 2, năm học 2026–2027">
        <div className={`reg-window${open ? " is-open" : ""}`} role="status">
          <span className="reg-window-dot" aria-hidden="true" />
          <span>
            <strong>{open ? "Đang mở đăng ký" : "Ngoài thời gian đăng ký"}</strong>
            {" · "}
            {clock(period.opens)} {shortDay(period.opens)} – {clock(period.closes)} {shortDay(period.closes)}
          </span>
        </div>
      </PageTitle>

      <div className="reg-ledger">
        <div className="reg-quota-card">
          <div className="reg-quota-head">
            <div>
              <span className="reg-label">Định mức tín chỉ dự kiến</span>
              <p className="reg-figure">
                <strong>{planned}</strong>
                <span>/ {creditLimit.max} TC</span>
              </p>
            </div>
            <span className={`reg-standing ${planned > creditLimit.max ? "danger" : planned < creditLimit.min ? "warn" : "good"}`}>
              {planned > creditLimit.max
                ? `Vượt ${planned - creditLimit.max} TC`
                : planned < creditLimit.min
                  ? `Thiếu ${creditLimit.min - planned} TC tối thiểu`
                  : `Đạt định mức ${creditLimit.min}–${creditLimit.max} TC`}
            </span>
          </div>
          <div className="reg-meter" role="img" aria-label={`Đã xếp ${current} tín chỉ, đăng ký thêm ${extra} tín chỉ trên tối đa ${creditLimit.max} tín chỉ`}>
            <span className="reg-meter-current" style={{ width: `${currentPct}%` }} />
            <span className="reg-meter-extra" style={{ width: `${extraPct}%`, left: `${currentPct}%` }} />
            <i className="reg-meter-min" style={{ left: `${minPct}%` }} title={`Tối thiểu ${creditLimit.min} TC`} />
          </div>
          <div className="reg-quota-foot">
            <span><i className="dot-current" /> Đã xếp lịch: <strong>{current} TC</strong></span>
            <span><i className="dot-extra" /> Đăng ký thêm: <strong>+{extra} TC</strong> ({picked.length} môn)</span>
            <span className="reg-quota-min">Tối thiểu {creditLimit.min} TC</span>
          </div>
        </div>

        <div className="reg-picked-card">
          <div className="reg-picked-head">
            <span className="reg-label">Học phần đăng ký thêm</span>
            <span className="reg-picked-count">{picked.length} môn</span>
          </div>
          {pickedOfferings.length > 0 ? (
            <ul className="reg-picked-list">
              {pickedOfferings.map((item) => (
                <li key={item.code}>
                  <div>
                    <code>{item.code}</code>
                    <strong>{item.name}</strong>
                  </div>
                  <span>{item.credits} TC</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="reg-picked-empty">Chưa chọn thêm học phần nào trong đợt này</p>
          )}
        </div>
      </div>

      <Section
        title="Học phần mở trong kỳ"
        action={<span className="reg-table-meta">{offerings.length} lớp học phần</span>}
      >
        <ul className="pt-list pt-offer-ledger">
          {offerings.map((item) => {
            const chosen = picked.includes(item.code);
            const full = !chosen && item.enrolled >= item.capacity;
            const missing = item.prerequisite && !passedCodes.has(item.prerequisite) ? item.prerequisite : null;
            const overLimit = !chosen && planned + item.credits > creditLimit.max;
            const blocked = !open || full || Boolean(missing) || overLimit;
            const enrolledNow = item.enrolled + (chosen ? 1 : 0);
            const seats = Math.max(0, item.capacity - enrolledNow);
            const fillPct = Math.min(100, Math.round((enrolledNow / item.capacity) * 100));
            const seatState = seats <= 0 ? "danger" : seats <= 10 ? "warn" : "good";
            return (
              <li key={item.code} className={`pt-offer${chosen ? " is-chosen" : ""}${blocked && !chosen ? " is-blocked" : ""}`}>
                <div className="pt-offer-code">
                  <code>{item.code}</code>
                  <span>{item.credits} tín chỉ</span>
                </div>
                <div className="pt-offer-main">
                  <h4>{item.name}</h4>
                  {missing && <p className="pt-warn">Yêu cầu đạt học phần tiên quyết {missing}</p>}
                  {!missing && overLimit && <p className="pt-warn">Vượt trần {creditLimit.max} tín chỉ học kỳ</p>}
                </div>
                <div className="pt-offer-sched">
                  <strong>{item.lecturer}</strong>
                  <span>{item.schedule}</span>
                </div>
                <div className="pt-offer-side">
                  <div className={`pt-seat ${seatState}`}>
                    <span className="pt-seat-text">
                      <i aria-hidden="true" />
                      {seats <= 0 ? "Hết chỗ" : `Còn ${seats}/${item.capacity} chỗ`}
                    </span>
                    <span className="pt-seat-bar" aria-hidden="true">
                      <b style={{ width: `${fillPct}%` }} />
                    </span>
                  </div>
                  <button
                    className={`button button-small ${chosen ? "button-primary" : "button-outline"}`}
                    type="button"
                    onClick={() => toggle(item.code)}
                    disabled={!chosen && blocked}
                    aria-pressed={chosen}
                  >
                    {chosen ? <><Icon name="check" /> Đã đăng ký</> : full ? "Đã đầy" : missing ? "Thiếu ĐK" : "Đăng ký"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </>
  );
}

