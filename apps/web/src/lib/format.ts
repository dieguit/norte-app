import type { Money } from "./money";

const ES_AR_LOCALE = "es-AR";

export function formatMoney(money: Money): string {
  const num = Number(money.amount);
  const formattedNumber = new Intl.NumberFormat(ES_AR_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  const prefix = money.currency === "USD" ? "US$ " : "$ ";
  return `${prefix}${formattedNumber}`;
}

export function formatCompactMoney(money: Money): string {
  const num = Number(money.amount);
  const prefix = money.currency === "USD" ? "US$ " : "$ ";

  if (num >= 1_000_000) {
    const millions = (num / 1_000_000).toLocaleString(ES_AR_LOCALE, {
      maximumFractionDigits: 1,
    });
    return `${prefix}${millions} M`;
  }

  if (num >= 1_000) {
    const thousands = (num / 1_000).toLocaleString(ES_AR_LOCALE, {
      maximumFractionDigits: 1,
    });
    return `${prefix}${thousands} k`;
  }

  return formatMoney(money);
}

export function formatPercentage(value: number | string, decimals = 1): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0%";
  const formatted = num.toLocaleString(ES_AR_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${formatted}%`;
}

export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(ES_AR_LOCALE, options);
}

export function formatMonthDelta(months: number): string {
  if (months === 0) return "mismo mes";
  if (months === 1) return "+1 mes";
  if (months === -1) return "-1 mes";
  return months > 0 ? `+${months} meses` : `${months} meses`;
}

export function formatCalendarMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat(ES_AR_LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return formatted[0].toUpperCase() + formatted.slice(1);
}

export function formatMonthName(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(ES_AR_LOCALE, {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

