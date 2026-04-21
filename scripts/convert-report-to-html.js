import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const inputPath = path.join(rootDir, "docs", "NearBuy_Project_Report.md");
const outputPath = path.join(rootDir, "docs", "NearBuy_Project_Report.html");

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTable(lines, startIndex) {
  const rows = [];
  let index = startIndex;

  while (index < lines.length && /^\s*\|/.test(lines[index])) {
    if (!isTableSeparator(lines[index])) {
      const cells = lines[index]
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => inlineFormat(cell.trim()));
      rows.push(cells);
    }
    index += 1;
  }

  const [header = [], ...body] = rows;
  const headerHtml = header.map((cell) => `<th>${cell}</th>`).join("");
  const bodyHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("\n");

  return {
    html: `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`,
    nextIndex: index,
  };
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;
  let inCode = false;
  let codeBuffer = [];
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineFormat(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
      }
      index += 1;
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      index += 1;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (trimmed.includes("page-break-after")) {
      flushParagraph();
      html.push('<div class="page-break"></div>');
      index += 1;
      continue;
    }

    if (/^\s*\|/.test(line) && lines[index + 1] && isTableSeparator(lines[index + 1])) {
      flushParagraph();
      const table = parseTable(lines, index);
      html.push(table.html);
      index = table.nextIndex;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inlineFormat(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inlineFormat(item)}</li>`).join("")}</ul>`);
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();

  return html.join("\n");
}

const markdown = fs.readFileSync(inputPath, "utf8");
const body = parseMarkdown(markdown);

const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NearBuy Project Report</title>
  <style>
    @page {
      size: A4;
      margin: 22mm 18mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      color: #111827;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.45;
      margin: 0;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-family: "Times New Roman", Times, serif;
      line-height: 1.2;
      margin: 18pt 0 8pt;
      page-break-after: avoid;
    }

    h1 {
      font-size: 18pt;
      text-align: center;
      text-transform: uppercase;
    }

    h2 {
      font-size: 15pt;
    }

    h3 {
      font-size: 13pt;
    }

    p {
      margin: 0 0 8pt;
      text-align: justify;
    }

    ol, ul {
      margin: 0 0 8pt 22pt;
      padding: 0;
    }

    li {
      margin: 0 0 4pt;
    }

    table {
      border-collapse: collapse;
      margin: 10pt 0 14pt;
      page-break-inside: avoid;
      width: 100%;
    }

    th, td {
      border: 1px solid #334155;
      padding: 6pt;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #e2e8f0;
      font-weight: bold;
    }

    pre {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      font-size: 10pt;
      overflow-wrap: anywhere;
      padding: 8pt;
      white-space: pre-wrap;
    }

    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 10.5pt;
    }

    .page-break {
      break-after: page;
      page-break-after: always;
    }
  </style>
</head>
<body>
${body}
</body>
</html>
`;

fs.writeFileSync(outputPath, document, "utf8");
console.log(outputPath);
