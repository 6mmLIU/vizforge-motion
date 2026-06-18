import type { DataRow } from "@/lib/visual/visualSpec";

export function parseMarkdownTable(input: string): { rows: DataRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = input
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 3) return { rows: [], warnings: ["No Markdown table was found."] };

  const headers = lines[0]
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  const rows = lines.slice(2).map((line) => {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const row: DataRow = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? null;
    });
    return row;
  });

  return { rows, warnings };
}
