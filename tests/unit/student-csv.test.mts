import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCsv, readStudentCsv, toCsv, toIsoDate } from "../../apps/web/src/lib/student-csv.ts";

test("parses quotes, doubled quotes, CRLF and a BOM", () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n'), [["a", "b"], ["x, y", 'say "hi"']]);
});

test("detects Excel's semicolon separator", () => {
  assert.deepEqual(parseCsv("ma_sv;ho_ten\n2200401;Nguyễn Văn A"), [["ma_sv", "ho_ten"], ["2200401", "Nguyễn Văn A"]]);
});

test("reads Vietnamese dates and rejects impossible ones", () => {
  assert.equal(toIsoDate("05/09/2004"), "2004-09-05");
  assert.equal(toIsoDate("2004-09-05"), "2004-09-05");
  assert.equal(toIsoDate("31/02/2004"), null);
  assert.equal(toIsoDate("hôm qua"), null);
});

test("reports every problem per row, including duplicates", () => {
  const { rows, error } = readStudentCsv(
    "ma_sv,ho_ten,ngay_sinh,gioi_tinh,dien_thoai\n" +
      "2200401,Nguyễn   Văn A,05/09/2004,Nam,0912 345 678\n" +
      "12ab,B,31/02/2004,nam,xx\n" +
      "2200401,Trùng Mã,,,\n",
  );
  assert.equal(error, undefined);
  assert.deepEqual(rows[0], { line: 2, input: { student_code: "2200401", full_name: "Nguyễn Văn A", gender: "Nam", phone: "0912 345 678", date_of_birth: "2004-09-05" }, problems: [] });
  assert.equal(rows[1]!.problems.length, 5);
  assert.deepEqual(rows[2]!.problems, ["Trùng mã với một dòng phía trên"]);
});

test("needs the code and name columns", () => {
  assert.match(readStudentCsv("ten,lop\nA,B").error!, /ma_sv/);
});

test("writes cells a spreadsheet cannot run as formulas", () => {
  assert.equal(toCsv([["=1+1", 'a"b', "x,y"]]), "﻿'=1+1,\"a\"\"b\",\"x,y\"");
});
