"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import {
  courses,
  creditLimit,
  initialRegistration,
  longDay,
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
  const extra = offerings.filter((item) => picked.includes(item.code)).reduce((sum, item) => sum + item.credits, 0);
  const planned = current + extra;

  function toggle(code: string) {
    const offering = offerings.find((item) => item.code === code)!;
    if (picked.includes(code)) {
      setPicked((value) => value.filter((item) => item !== code));
      setStatus(`Đã huỷ đăng ký ${offering.name}.`);
    } else {
      setPicked((value) => [...value, code]);
      setStatus(`Đã đăng ký ${offering.name}.`);
    }
  }

  return (
    <>
      <DemoBanner />
      <PageTitle title="Đăng ký học phần" lead="Đăng ký cho học kỳ 2, năm học 2026-2027." />

      <div className={`notice ${open ? "success" : ""}`} role="status">
        <Icon name={open ? "checkCircle" : "info"} />
        <div>
          <strong>{open ? "Đang mở đăng ký" : "Chưa đến thời gian đăng ký"}</strong>
          <p>
            Từ {clock(period.opens)} {longDay(period.opens)} đến {clock(period.closes)} {longDay(period.closes)}.
          </p>
        </div>
      </div>

      <div className="pt-stats">
        <StatTile icon="book" label="Học kỳ hiện tại" value={`${current} TC`} note="Đã xếp lịch" />
        <StatTile icon="clipboard" label="Đăng ký thêm" value={`${extra} TC`} note={`${picked.length} học phần`} />
        <StatTile
          icon="trend"
          label="Dự kiến"
          value={`${planned} TC`}
          note={`Cho phép ${creditLimit.min}-${creditLimit.max} TC`}
          tone={planned > creditLimit.max ? "danger" : planned < creditLimit.min ? "warn" : "good"}
        />
      </div>

      <Section title="Học phần mở" icon="list">
        <ul className="pt-list">
          {offerings.map((item) => {
            const chosen = picked.includes(item.code);
            const full = !chosen && item.enrolled >= item.capacity;
            const missing = item.prerequisite && !passedCodes.has(item.prerequisite) ? item.prerequisite : null;
            const overLimit = !chosen && planned + item.credits > creditLimit.max;
            const blocked = !open || full || Boolean(missing) || overLimit;
            const seats = item.capacity - item.enrolled - (chosen ? 1 : 0);
            return (
              <li key={item.code} className={`pt-offer${chosen ? " is-chosen" : ""}`}>
                <div>
                  <p className="pt-code">{item.code} · {item.credits} tín chỉ</p>
                  <h4>{item.name}</h4>
                  <p className="pt-meta">
                    <span><Icon name="user" /> {item.lecturer}</span>
                    <span><Icon name="calendar" /> {item.schedule}</span>
                  </p>
                  {missing && <p className="pt-warn">Cần đạt học phần tiên quyết {missing} trước.</p>}
                  {!missing && overLimit && <p className="pt-warn">Vượt giới hạn {creditLimit.max} tín chỉ.</p>}
                </div>
                <div className="pt-offer-side">
                  <span className={`chip ${seats <= 0 ? "overdue" : seats <= 10 ? "soon" : ""}`}>
                    {seats <= 0 ? "Hết chỗ" : `Còn ${seats}/${item.capacity} chỗ`}
                  </span>
                  <button
                    className={`button button-small ${chosen ? "button-outline" : "button-primary"}`}
                    type="button"
                    onClick={() => toggle(item.code)}
                    disabled={!chosen && blocked}
                    aria-pressed={chosen}
                  >
                    {chosen ? <><Icon name="check" /> Đã đăng ký</> : "Đăng ký"}
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
