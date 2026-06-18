import type { ColumnSchema, ColumnType, DataRow } from "@/lib/visual/visualSpec";

const NUMBER_RE = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?%?$/;

function present(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function detectType(values: unknown[]): ColumnType {
  const usable = values.filter(present);
  if (usable.length === 0) return "unknown";

  const numberCount = usable.filter((value) => {
    if (typeof value === "number") return Number.isFinite(value);
    return NUMBER_RE.test(String(value).trim());
  }).length;

  const booleanCount = usable.filter((value) => {
    if (typeof value === "boolean") return true;
    return ["true", "false", "yes", "no"].includes(String(value).trim().toLowerCase());
  }).length;

  const dateCount = usable.filter((value) => {
    if (value instanceof Date) return true;
    const text = String(value).trim();
    if (/^\d{4}-\d{1,2}(?:-\d{1,2})?$/.test(text) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
      return !Number.isNaN(Date.parse(text.length === 7 ? `${text}-01` : text));
    }
    return false;
  }).length;

  if (numberCount / usable.length >= 0.85) return "number";
  if (dateCount / usable.length >= 0.75) return "date";
  if (booleanCount / usable.length >= 0.85) return "boolean";

  const uniqueCount = new Set(usable.map((value) => String(value).trim())).size;
  if (uniqueCount <= Math.max(24, Math.ceil(usable.length * 0.6))) return "category";

  return "string";
}

export function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!present(value)) return null;
  const text = String(value).trim().replace(/,/g, "");
  const multiplier = text.endsWith("%") ? 0.01 : 1;
  const numeric = Number.parseFloat(text.replace(/%$/, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : null;
}

export function inferSchema(rows: DataRow[]): ColumnSchema[] {
  const names = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  return names.map((name) => {
    const values = rows.map((row) => row[name]);
    const usable = values.filter(present);
    const examples = Array.from(new Set(usable.map((value) => String(value).trim())))
      .slice(0, 4)
      .map((value) => {
        const numeric = coerceNumber(value);
        return numeric !== null && detectType(values) === "number" ? numeric : value;
      });

    return {
      name,
      type: detectType(values),
      nullable: usable.length < values.length,
      uniqueCount: new Set(usable.map((value) => String(value).trim())).size,
      examples
    };
  });
}
