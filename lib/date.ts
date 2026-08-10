/**
 * Local calendar date, not UTC — the shop's day is what matters, both for the
 * daily scan allowance and for export filenames.
 *
 * Lives on its own so the quota modules and the export package can each use it
 * without pulling in the other's dependency graph.
 */
export function localDateKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
