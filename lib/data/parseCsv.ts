import type { DataRow } from "@/lib/visual/visualSpec";

export type ParseResult = {
  rows: DataRow[];
  warnings: string[];
};

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(input: string): ParseResult {
  const warnings: string[] = [];
  const clean = input.replace(/^\uFEFF/, "").trim();

  if (!clean) {
    return { rows: [], warnings: ["CSV input is empty."] };
  }

  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headers = parseLine(lines[0]).map((header, index) => header || `column_${index + 1}`);
  const rows: DataRow[] = [];

  for (const [lineIndex, line] of lines.slice(1).entries()) {
    const values = parseLine(line);
    if (values.length !== headers.length) {
      warnings.push(`Row ${lineIndex + 2} has ${values.length} cells; expected ${headers.length}.`);
    }

    const row: DataRow = {};
    headers.forEach((header, index) => {
      const value = values[index] ?? "";
      row[header] = value === "" ? null : value;
    });
    rows.push(row);
  }

  if (rows.length === 0) warnings.push("CSV input has headers but no data rows.");
  if (headers.length > 50) warnings.push("CSV has more than 50 columns; only compact datasets are recommended.");
  if (rows.length > 5000) warnings.push("CSV has more than 5000 rows; API rendering will reject oversized payloads.");

  return { rows, warnings };
}
