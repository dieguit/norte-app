import type { BenefitRules } from '@repo/shared-types';
import {
  argentinaInstant,
  DAY_MS,
  todayInArgentina,
} from '../../argentina-time';

function matchesSchedule(validity: BenefitRules['validity'], day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const weekdayMatches = validity.weekdays?.includes(date.getUTCDay()) ?? true;
  const monthDayMatches =
    validity.monthDays?.includes(date.getUTCDate()) ?? true;
  return weekdayMatches && monthDayMatches;
}

function nextMatchingDate(
  validity: BenefitRules['validity'],
  today: string,
  lookaheadDays: number,
): string | null {
  for (let offset = 1; offset <= lookaheadDays; offset++) {
    const day = todayInArgentina(
      new Date(argentinaInstant(today).getTime() + offset * DAY_MS),
    ).today;
    if (day > (validity.to ?? day)) break;
    if (matchesSchedule(validity, day)) return day;
  }
  return null;
}

export function evaluateAvailability(
  rules: BenefitRules,
  opts: {
    lifecycle: string;
    today: string;
    lastVerifiedAt: Date | null;
    now: Date;
    staleAfterMs?: number;
    excludeAfterMs?: number;
    lookaheadDays?: number;
  },
): {
  availability: 'available' | 'upcoming' | 'unavailable' | 'unknown';
  nextDate: string | null;
  stale: boolean;
  reasons: string[];
} {
  const age = opts.lastVerifiedAt
    ? opts.now.getTime() - opts.lastVerifiedAt.getTime()
    : Infinity;
  const stale = age > (opts.staleAfterMs ?? 2 * DAY_MS);
  const result = (
    availability: 'available' | 'upcoming' | 'unavailable' | 'unknown',
    reasons: string[] = [],
    nextDate: string | null = null,
  ) => ({ availability, nextDate, stale, reasons });
  if (opts.lifecycle !== 'published')
    return result('unavailable', [`Estado: ${opts.lifecycle}`]);
  if (age > (opts.excludeAfterMs ?? 7 * DAY_MS))
    return result('unavailable', ['stale']);
  const { from, to } = rules.validity;
  if (opts.today < (from ?? opts.today) || opts.today > (to ?? opts.today))
    return result('unavailable', ['Fuera de campaña']);
  const reasons = to === null ? ['Fin de vigencia desconocido'] : [];
  if (matchesSchedule(rules.validity, opts.today))
    return result('available', reasons);
  const nextDate = nextMatchingDate(
    rules.validity,
    opts.today,
    opts.lookaheadDays ?? 7,
  );
  if (nextDate) return result('upcoming', reasons, nextDate);
  return result('unavailable', ['Sin fecha aplicable dentro del horizonte']);
}
