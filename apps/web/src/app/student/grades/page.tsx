"use client";

import { DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { courses, gpa, letter, program, semester, standing, terms, total } from "@/lib/portal-demo";

const score = (value: number) => value.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function GradesPage() {
  const allRows = terms.flatMap((term) => term.rows);
  const passed = allRows.filter((row) => total(row) >= 4);
  const earned = passed.reduce((sum, row) => sum + row.credits, 0);
  const overall = gpa(allRows);
  const inProgress = courses.reduce((sum, item) => sum + item.credits, 0);
  const percent = Math.round((earned / program.requiredCredits) * 100);

  return (
    <>
      <DemoBanner />
      <PageTitle title="Kết quả học tập" lead={`Ngành ${program.name}. Điểm tổng kết = 10% chuyên cần + 30% giữa kỳ + 60% cuối kỳ.`} />

      <div className="pt-stats">
        <StatTile icon="award" label="GPA tích luỹ (hệ 4)" value={overall.value.toFixed(2)} note={`Xếp loại ${standing(overall.value)}`} tone="good" />
        <StatTile icon="checkCircle" label="Tín chỉ tích luỹ" value={`${earned}/${program.requiredCredits}`} note={`Đã hoàn thành ${percent}% chương trình`} />
        <StatTile icon="book" label="Đang học" value={`${inProgress} tín chỉ`} note={semester.short} />
        <StatTile icon="trend" label="GPA học kỳ gần nhất" value={gpa(terms[0]!.rows).value.toFixed(2)} note={terms[0]!.name} />
      </div>
      <div className="pt-progress" role="img" aria-label={`Tiến độ chương trình: ${earned} trên ${program.requiredCredits} tín chỉ`}>
        <span style={{ width: `${percent}%` }} />
      </div>

      {terms.map((term) => {
        const termGpa = gpa(term.rows);
        return (
          <Section key={term.name} title={term.name} icon="list" action={<span className="chip">GPA {termGpa.value.toFixed(2)} · {standing(termGpa.value)}</span>}>
            <div className="table-wrap">
              <table className="data-table pt-grades">
                <thead>
                  <tr>
                    <th scope="col">Mã HP</th>
                    <th scope="col">Học phần</th>
                    <th scope="col">TC</th>
                    <th scope="col">CC</th>
                    <th scope="col">GK</th>
                    <th scope="col">CK</th>
                    <th scope="col">Tổng</th>
                    <th scope="col">Chữ</th>
                    <th scope="col">Hệ 4</th>
                  </tr>
                </thead>
                <tbody>
                  {term.rows.map((row) => {
                    const value = total(row);
                    const { grade, point } = letter(value);
                    return (
                      <tr key={row.code}>
                        <td className="pt-code">{row.code}</td>
                        <td>
                          {row.name}
                          {row.code.startsWith("PE") && <small className="pt-muted"> (không tính GPA)</small>}
                        </td>
                        <td>{row.credits}</td>
                        <td>{score(row.attendance)}</td>
                        <td>{score(row.midterm)}</td>
                        <td>{score(row.final)}</td>
                        <td><strong>{score(value)}</strong></td>
                        <td><span className={`pt-grade g-${grade.replace("+", "p")}`}>{grade}</span></td>
                        <td>{point.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })}

      <Section title={`${semester.short}: đang học`} icon="clock">
        <ul className="pt-chips">
          {courses.map((course) => (
            <li key={course.code}>
              <span className="pt-code">{course.code}</span> {course.name} · {course.credits} TC
            </li>
          ))}
        </ul>
        <p className="pt-muted">Điểm được cập nhật sau khi giảng viên nhập và phòng Đào tạo duyệt.</p>
      </Section>
    </>
  );
}
