export function seconds(ms: number): string {
  return `${Math.max(0, ms / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}s`;
}

export function stagger(index: number, baseDelayMs: number, staggerMs: number): number {
  return baseDelayMs + index * staggerMs;
}
