const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const DAY_MS = 86_400_000;

export function todayInArgentina(now = new Date()): {
  today: string;
  month: string;
} {
  const today = formatter.format(now);
  return { today, month: today.slice(0, 7) };
}

// Argentina is fixed at UTC-3 with no DST since 2009.
export const argentinaInstant = (day: string, time = '00:00') =>
  new Date(`${day}T${time}:00-03:00`);

export const previousDay = (day: string) =>
  todayInArgentina(new Date(argentinaInstant(day).getTime() - DAY_MS)).today;
