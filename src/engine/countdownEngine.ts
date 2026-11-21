import type { CountdownInfo, CountdownTarget, CustomCountdownConfig } from '../types/studio';

interface TemporalLike {
  Now: {
    zonedDateTimeISO(): ZonedDateTimeLike;
  };
  PlainDate: {
    from(isoDate: string): {
      year: number;
      month: number;
      day: number;
      toPlainDateTime(time: string): {
        toZonedDateTime(tz: string, options?: { disambiguation?: 'compatible' }): ZonedDateTimeLike;
      };
    };
  };
  PlainDateTime: {
    from(input: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      second: number;
    }): {
      toZonedDateTime(tz: string, options?: { disambiguation?: 'compatible' }): ZonedDateTimeLike;
    };
  };
  ZonedDateTime: {
    compare(a: ZonedDateTimeLike, b: ZonedDateTimeLike): number;
  };
}

interface ZonedDateTimeLike {
  year: number;
  month: number;
  day: number;
  hour: number;
  timeZoneId: string;
  with(fields: { year?: number; month?: number; day?: number }): ZonedDateTimeLike;
  until(
    other: ZonedDateTimeLike,
    options: { largestUnit: 'day' },
  ): { days: number; hours: number; minutes: number; seconds: number };
}

let temporalImpl: TemporalLike | null =
  typeof globalThis !== 'undefined' && 'Temporal' in globalThis
    ? ((globalThis as unknown as { Temporal?: TemporalLike }).Temporal ?? null)
    : null;

let loadPromise: Promise<boolean> | null = null;

export function isTemporalReady(): boolean {
  return temporalImpl !== null;
}

export async function ensureTemporal(): Promise<boolean> {
  if (temporalImpl) return true;
  if (!loadPromise) {
    loadPromise = import('@js-temporal/polyfill')
      .then((mod) => {
        if (mod && 'Temporal' in mod && mod.Temporal) {
          temporalImpl = mod.Temporal as unknown as TemporalLike;
          return true;
        }
        return false;
      })
      .catch(() => false);
  }
  return loadPromise;
}

function parseIsoParts(isoDate: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function getNextTargetInfo(
  mode: CountdownTarget = 'newyear',
  customTarget?: CustomCountdownConfig,
): CountdownInfo {
  const T = temporalImpl;

  if (T) {
    const now = T.Now.zonedDateTimeISO();
    const tz = now.timeZoneId;

    if (mode === 'custom' && customTarget) {
      const parts = parseIsoParts(customTarget.isoDate);
      if (parts) {
        const cleanName = (customTarget.label || 'SPECIAL DAY').toUpperCase();
        const plainDate = T.PlainDate.from(customTarget.isoDate);
        const target = plainDate
          .toPlainDateTime('00:00:00')
          .toZonedDateTime(tz, { disambiguation: 'compatible' });

        const isSameDay =
          now.year === plainDate.year &&
          now.month === plainDate.month &&
          now.day === plainDate.day;
        if (isSameDay) {
          return {
            isCelebrationDay: true,
            year: plainDate.year,
            label: `HAPPY ${cleanName}!`,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
          };
        }

        if (T.ZonedDateTime.compare(now, target) >= 0) {
          return {
            isCelebrationDay: false,
            isPast: true,
            year: plainDate.year,
            label: `${cleanName} HAS ARRIVED`,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
          };
        }

        const diff = now.until(target, { largestUnit: 'day' });
        return {
          isCelebrationDay: false,
          year: plainDate.year,
          label: `COUNTDOWN TO ${cleanName}`,
          days: Math.max(0, diff.days),
          hours: Math.max(0, diff.hours),
          minutes: Math.max(0, diff.minutes),
          seconds: Math.max(0, diff.seconds),
        };
      }
    }

    if (mode === 'christmas') {
      let targetYear = now.year;
      let target = T.PlainDateTime.from({
        year: targetYear,
        month: 12,
        day: 25,
        hour: 0,
        minute: 0,
        second: 0,
      }).toZonedDateTime(tz);

      if (T.ZonedDateTime.compare(now, target) >= 0) {
        if (now.month === 12 && now.day === 25) {
          return {
            isCelebrationDay: true,
            year: targetYear,
            label: `IT'S CHRISTMAS ${targetYear}!`,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
          };
        }
        targetYear += 1;
        target = target.with({ year: targetYear });
      }

      const diff = now.until(target, { largestUnit: 'day' });
      return {
        isCelebrationDay: false,
        year: targetYear,
        label: `COUNTDOWN TO CHRISTMAS ${targetYear}`,
        days: Math.max(0, diff.days),
        hours: Math.max(0, diff.hours),
        minutes: Math.max(0, diff.minutes),
        seconds: Math.max(0, diff.seconds),
      };
    }

    // Default: New Year (celebrate all day on January 1, 00:00:00–23:59:59)
    if (now.month === 1 && now.day === 1) {
      return {
        isCelebrationDay: true,
        year: now.year,
        label: `HAPPY NEW YEAR ${now.year}!`,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    const targetYear = now.year + 1;
    const target = T.PlainDateTime.from({
      year: targetYear,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    }).toZonedDateTime(tz);

    const diff = now.until(target, { largestUnit: 'day' });
    return {
      isCelebrationDay: false,
      year: targetYear,
      label: `COUNTDOWN TO NEW YEAR ${targetYear}`,
      days: Math.max(0, diff.days),
      hours: Math.max(0, diff.hours),
      minutes: Math.max(0, diff.minutes),
      seconds: Math.max(0, diff.seconds),
    };
  }

  // Offline / pre-hydration Date fallback
  const now = new Date();
  const currentYear = now.getFullYear();

  if (mode === 'custom' && customTarget) {
    const parts = parseIsoParts(customTarget.isoDate);
    if (parts) {
      const cleanName = (customTarget.label || 'SPECIAL DAY').toUpperCase();
      const targetDate = new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0);
      const isSameDay =
        now.getFullYear() === parts.year &&
        now.getMonth() === parts.month - 1 &&
        now.getDate() === parts.day;
      if (isSameDay) {
        return {
          isCelebrationDay: true,
          year: parts.year,
          label: `HAPPY ${cleanName}!`,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }
      if (now >= targetDate) {
        return {
          isCelebrationDay: false,
          isPast: true,
          year: parts.year,
          label: `${cleanName} HAS ARRIVED`,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }
      const totalSec = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
      return {
        isCelebrationDay: false,
        year: parts.year,
        label: `COUNTDOWN TO ${cleanName}`,
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
      };
    }
  }

  let targetDate: Date;
  let targetYear = currentYear;
  let label: string;

  if (mode === 'christmas') {
    targetDate = new Date(currentYear, 11, 25, 0, 0, 0);
    if (now >= targetDate) {
      if (now.getMonth() === 11 && now.getDate() === 25) {
        return {
          isCelebrationDay: true,
          year: currentYear,
          label: `IT'S CHRISTMAS ${currentYear}!`,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }
      targetYear = currentYear + 1;
      targetDate = new Date(targetYear, 11, 25, 0, 0, 0);
    }
    label = `COUNTDOWN TO CHRISTMAS ${targetYear}`;
  } else {
    if (now.getMonth() === 0 && now.getDate() === 1) {
      return {
        isCelebrationDay: true,
        year: currentYear,
        label: `HAPPY NEW YEAR ${currentYear}!`,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }
    targetYear = currentYear + 1;
    targetDate = new Date(targetYear, 0, 1, 0, 0, 0);
    label = `COUNTDOWN TO NEW YEAR ${targetYear}`;
  }

  const totalSec = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 1000));
  return {
    isCelebrationDay: false,
    year: targetYear,
    label,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}
