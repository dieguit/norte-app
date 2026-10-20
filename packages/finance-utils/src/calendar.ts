export function getNextCalendarMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export function getPreviousCalendarMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() - 1
  const prev = new Date(Date.UTC(year, month, 1))
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`
}
