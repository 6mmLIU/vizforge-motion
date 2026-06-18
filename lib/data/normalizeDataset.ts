import { inferSchema } from "@/lib/data/inferSchema";
import type { DataRow, ParsedDataset } from "@/lib/visual/visualSpec";

export type NormalizeOptions = {
  animated?: boolean;
};

export function normalizeDataset(rows: DataRow[], options: NormalizeOptions = {}): ParsedDataset {
  const warnings: string[] = [];
  const cleaned = rows.filter((row) =>
    Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== "")
  );

  if (cleaned.length === 0) warnings.push("Dataset has no non-empty rows.");
  if (cleaned.length !== rows.length) warnings.push(`${rows.length - cleaned.length} empty rows were removed.`);
  if (cleaned.length > 5000) warnings.push("Dataset has more than 5000 rows.");
  if (options.animated && cleaned.length > 500) warnings.push("当前编辑器预览建议控制在 500 行内；具体图表会按自己的安全上限截取。");

  const columns = inferSchema(cleaned);
  if (columns.length > 50) warnings.push("Dataset has more than 50 columns.");

  return { rows: cleaned, columns, warnings };
}
