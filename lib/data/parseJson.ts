import type { DataRow } from "@/lib/visual/visualSpec";

export type JsonParseResult = {
  rows: DataRow[];
  warnings: string[];
};

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

export function parseJson(input: string): JsonParseResult {
  const warnings: string[] = [];

  if (!input.trim()) {
    return { rows: [], warnings: ["JSON input is empty."] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    return {
      rows: [],
      warnings: [error instanceof Error ? error.message : "Invalid JSON input."]
    };
  }

  const source = Array.isArray(parsed) ? parsed : [parsed];
  const rows: DataRow[] = [];

  for (const [index, item] of source.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      warnings.push(`Item ${index + 1} is not an object and was skipped.`);
      continue;
    }

    const row: DataRow = {};
    for (const [key, value] of Object.entries(item)) {
      if (isPrimitive(value)) {
        row[key] = value;
      } else {
        row[key] = JSON.stringify(value);
        warnings.push(`Field "${key}" in item ${index + 1} was stringified because nested values are not renderable.`);
      }
    }
    rows.push(row);
  }

  if (rows.length > 5000) warnings.push("JSON has more than 5000 rows; API rendering will reject oversized payloads.");
  return { rows, warnings };
}
