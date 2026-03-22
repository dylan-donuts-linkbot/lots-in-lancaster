// Shared formatting utilities

/** Format a number with optional prefix (e.g. '$'). Returns '—' for null. */
export function fmt(n: number | null | undefined, prefix = ''): string {
  if (n == null) return '—'
  return prefix + n.toLocaleString()
}

/** Format an ISO date string to locale date. Returns '—' for null/empty. */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
}

/** Format an ISO date string to locale date+time. Returns '—' for null/empty. */
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleString()
}

/** Format a number with '—' fallback. */
export function fmtNum(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}
