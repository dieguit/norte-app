const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const WEEKDAY = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' })
const SHORT_MONTH = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })

export const localDay = (iso: string) => DAY.format(new Date(iso))

// Incomes/expenses only store createdAt; recurring entries (and one-offs registered after their month) reuse its day-of-month in the viewed month.
export function movementDay(entry: { createdAt: string }, month: string) {
  const day = localDay(entry.createdAt)
  if (day.startsWith(month)) return day
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return `${month}-${String(Math.min(Number(day.slice(8)), lastDay)).padStart(2, '0')}`
}

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`)

export function formatDayHeading(day: string) {
  const weekday = WEEKDAY.format(utc(day))
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${Number(day.slice(8))}`
}

export const formatShortDay = (day: string) => `${day.slice(8)} ${SHORT_MONTH.format(utc(day)).replace('.', '')}`
