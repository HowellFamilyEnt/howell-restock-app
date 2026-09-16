// All date math is done in UTC to match how dates are stored (restock dates
// come from a plain <input type="date"> value parsed with `new Date(...)`,
// which JS treats as UTC midnight) - mixing in local-timezone Date methods
// here would shift days near midnight.

export function daysInMonth(year: number, month: number): number {
  // month is 1-12; day 0 of the *next* month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function isSameUtcMonth(date: Date, year: number, month: number): boolean {
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
}

export function todayUtc(): { year: number; month: number; day: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
}

export function monthName(month: number): string {
  return new Date(Date.UTC(2000, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// Converts a local wall-clock hour on a given date, in an arbitrary IANA
// timezone, to the correct UTC instant - needed for Seam (src/lib/seam.ts),
// which schedules real door-lock hardware and can't tolerate the
// fixed-UTC-hour shortcut used elsewhere in this app for less time-critical
// scheduling (see SCHEDULE_HOUR_UTC in scheduling.ts). Standard
// Intl-offset-diff technique, no date library needed: build a naive guess
// treating the wall-clock time as UTC, then measure how far that guess's
// UTC-formatted string differs from its `timezone`-formatted string at that
// same instant, and shift by the difference. Correct across DST boundaries
// because the offset is measured at the actual date in question, not
// assumed fixed.
export function zonedTimeToUtc(dateStr: string, hour: number, timezone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour));

  const asUtc = new Date(naiveUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  const asZoned = new Date(naiveUtc.toLocaleString("en-US", { timeZone: timezone }));
  const offsetMs = asUtc.getTime() - asZoned.getTime();

  return new Date(naiveUtc.getTime() + offsetMs);
}
