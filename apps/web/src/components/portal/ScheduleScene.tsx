import { PhuongTree } from "@/components/landing/Phuong";

/**
 * Backdrop for the schedule: sky, sun (moon at night), drifting clouds, layered hills and
 * phượng trees in bloom. Purely decorative; the day/night palette follows the app theme.
 */
export function ScheduleScene() {
  return (
    <div className="sch-scene" aria-hidden="true">
      <span className="sch-sun" />
      <span className="sch-stars" />
      <span className="sch-cloud c1" />
      <span className="sch-cloud c2" />
      <span className="sch-cloud c3" />
      <svg className="sch-hills" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path className="h1" d="M0 120C140 70 260 88 380 104C520 122 610 60 760 66C910 72 1010 120 1200 92V220H0Z" />
        <path className="h2" d="M0 158C170 120 300 140 440 150C600 162 720 118 880 124C1030 130 1110 156 1200 146V220H0Z" />
        <path className="h3" d="M0 190C200 170 380 184 560 188C760 192 960 170 1200 182V220H0Z" />
      </svg>
      <PhuongTree className="sch-tree-far" id="phuong-sch-far" />
      <PhuongTree className="sch-tree" id="phuong-sch" />
    </div>
  );
}
