/* eslint-disable @next/next/no-img-element -- must render before JS/image optimisation */
export function LogoLoader({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="logo-loader" role="status">
      <span className="logo-loader-mark">
        <img src="/sao-do-logo.png" alt="" width={88} height={94} />
      </span>
      <span>{label}</span>
    </div>
  );
}
