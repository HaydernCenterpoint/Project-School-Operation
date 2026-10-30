import { Icon, type IconName } from "@/components/Icon";

/** Shown on every module that still runs on sample data (see lib/portal-demo.ts). */
export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <span className="demo-banner-dot" aria-hidden="true" />
      <span><strong>Dữ liệu minh họa</strong> · Chưa kết nối hệ thống trường, thao tác chỉ lưu tạm trên trình duyệt này</span>
    </div>
  );
}

export function PageTitle({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="page-title pt-title">
      <div>
        <h2>{title}</h2>
        {lead && <p>{lead}</p>}
      </div>
      {children && <div className="pt-title-actions">{children}</div>}
    </div>
  );
}

export function StatTile({ label, value, note, tone }: { icon?: IconName; label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "good" | "warn" | "danger" }) {
  return (
    <div className={`pt-stat${tone ? ` ${tone}` : ""}`}>
      <span className="pt-stat-label">
        {tone && <i className="pt-stat-dot" aria-hidden="true" />}
        {label}
      </span>
      <strong>{value}</strong>
      {note && <span className="pt-stat-note">{note}</span>}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; icon?: IconName; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="pt-section">
      <header className="pt-section-head">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

/** Days until an ISO date, for "còn N ngày" labels. */
export function daysUntil(iso: string, now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function countdown(iso: string, now: number) {
  const days = daysUntil(iso, now);
  return days < 0 ? `${-days} ngày trước` : days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`;
}
