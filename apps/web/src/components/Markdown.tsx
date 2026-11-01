import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";
import { Tex } from "./Tex";

// Builds React elements only: model output is never injected as HTML (formulas go through
// Tex.tsx, which also builds elements), and links are limited to http(s) and open in a new tab
// without referrer. Inline math is $...$ or \(...\); a "$" only opens math when text follows it
// directly and only closes it when it is not followed by a digit, so "5$ và 10$" stays text.
const inlinePattern =
  /(`[^`]+`|<br\s*\/?>|&lt;br\s*\/?&gt;|\$\$(?:[^$]|\$(?!\$))+?\$\$|\$(?![\s$])(?:[^$\n\\]|\\.)+?(?<!\s)\$(?!\d)|\\\([^\n]+?\\\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\s][^*]*\*|(?<![\w])_[^_\s][^_]*_(?![\w]))/gi;

function inline(text: string): ReactNode[] {
  return text.split(inlinePattern).map((part, index) => {
    if (!part) return null;
    if (/^(?:<br\s*\/?>|&lt;br\s*\/?&gt;)$/i.test(part)) return <br key={index} />;
    if (part.length > 4 && part.startsWith("$$") && part.endsWith("$$")) return <Tex key={index} source={part.slice(2, -2)} display />;
    if (part.length > 2 && part.startsWith("$") && part.endsWith("$")) return <Tex key={index} source={part.slice(1, -1)} />;
    if (part.length > 4 && part.startsWith("\\(") && part.endsWith("\\)")) return <Tex key={index} source={part.slice(2, -2)} />;
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.length > 4 && ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__")))) {
      return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
    }
    if (part.length > 4 && part.startsWith("~~") && part.endsWith("~~")) return <s key={index}>{inline(part.slice(2, -2))}</s>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer nofollow">
          {link[1]}
        </a>
      );
    }
    if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_")))) {
      return <em key={index}>{inline(part.slice(1, -1))}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

const listPattern = /^(\s*)(?:[-*+•]|\d+[.)])\s+/;
const tableRow = /^\s*\|.*\|\s*$/;
const tableRule = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const isBlockStart = (line: string) =>
  line.startsWith("```") || /^\s*(\$\$|\\\[)/.test(line) || /^#{1,6}\s/.test(line) || listPattern.test(line) || line.startsWith(">") || /^\s*([-*_])\1{2,}\s*$/.test(line) || tableRow.test(line);

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());

type ListItem = { depth: number; ordered: boolean; text: string };

/** items[from..to) at the shallowest depth become one list; deeper runs nest inside their parent item. */
function renderList(items: ListItem[], from: number, to: number): ReactNode {
  const base = Math.min(...items.slice(from, to).map((item) => item.depth));
  const children: ReactNode[] = [];
  let index = from;
  while (index < to) {
    const item = items[index]!;
    let end = index + 1;
    while (end < to && items[end]!.depth > base) end += 1;
    children.push(
      <li key={index}>
        {inline(item.text)}
        {end > index + 1 && renderList(items, index + 1, end)}
      </li>,
    );
    index = end;
  }
  return items[from]!.ordered ? <ol>{children}</ol> : <ul>{children}</ul>;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;
    const key = blocks.length;

    // Fenced code (an unclosed fence while streaming still renders as code).
    if (line.startsWith("```")) {
      const language = line.slice(3).trim().split(/\s/)[0] ?? "";
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.startsWith("```")) code.push(lines[index++]!);
      index += 1;
      blocks.push(<CodeBlock key={key} code={code.join("\n")} language={language} />);
      continue;
    }
    // Display math: $$ ... $$ or \[ ... \], on one line or across several.
    const trimmed = line.trim();
    if (trimmed.startsWith("$$") || trimmed.startsWith("\\[")) {
      const open = trimmed.startsWith("$$") ? "$$" : "\\[";
      const close = open === "$$" ? "$$" : "\\]";
      const body: string[] = [];
      let rest = trimmed.slice(open.length);
      let closed = false;
      for (;;) {
        const at = rest.indexOf(close);
        if (at >= 0) {
          body.push(rest.slice(0, at));
          closed = true;
          break;
        }
        body.push(rest);
        index += 1;
        if (index >= lines.length) break;
        rest = lines[index]!;
      }
      index += 1;
      blocks.push(
        <div key={key} className="tx-block">
          {closed ? <Tex source={body.join(" ")} display /> : <code className="tx-raw">{body.join(" ")}</code>}
        </div>,
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push(heading[1]!.length <= 2 ? <h3 key={key}>{inline(heading[2]!)}</h3> : <h4 key={key}>{inline(heading[2]!)}</h4>);
      index += 1;
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push(<hr key={key} />);
      index += 1;
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index]!.startsWith(">")) quote.push(lines[index++]!.replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}><Markdown text={quote.join("\n")} /></blockquote>);
      continue;
    }
    // Table: header row, separator row, then body rows.
    if (tableRow.test(line) && tableRule.test(lines[index + 1] ?? "")) {
      const head = cells(line);
      const align = cells(lines[index + 1]!).map((cell) => (cell.endsWith(":") ? (cell.startsWith(":") ? "center" : "right") : "left"));
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && tableRow.test(lines[index]!)) rows.push(cells(lines[index++]!));
      blocks.push(
        <div key={key} className="md-table">
          <table>
            <thead>
              <tr>{head.map((cell, column) => <th key={column} style={{ textAlign: align[column] as "left" }}>{inline(cell)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {head.map((_, column) => <td key={column} style={{ textAlign: align[column] as "left" }}>{inline(row[column] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    // Lists: each 2+ spaces of indentation nests a real sub-list under the previous item.
    if (listPattern.test(line)) {
      const items: ListItem[] = [];
      while (index < lines.length && (listPattern.test(lines[index]!) || (/^\s{2,}\S/.test(lines[index]!) && items.length))) {
        const current = lines[index++]!;
        const match = current.match(listPattern);
        if (match) {
          items.push({ depth: Math.floor(match[1]!.length / 2), ordered: /^\s*\d/.test(current), text: current.replace(listPattern, "") });
        } else items[items.length - 1]!.text += ` ${current.trim()}`;
      }
      blocks.push(<Fragment key={key}>{renderList(items, 0, items.length)}</Fragment>);
      continue;
    }
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index]!.trim() && !isBlockStart(lines[index]!)) paragraph.push(lines[index++]!);
    if (!paragraph.length) paragraph.push(lines[index++]!);
    blocks.push(
      <p key={key}>
        {paragraph.map((part, partIndex) => (
          <Fragment key={partIndex}>
            {partIndex > 0 && <br />}
            {inline(part)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <>{blocks}</>;
}
