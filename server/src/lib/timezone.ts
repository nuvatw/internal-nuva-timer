/**
 * Timezone utilities for converting IANA timezone names to offset strings
 * and computing dates in a user's local timezone.
 */

const DEFAULT_TZ = "Asia/Taipei";

/**
 * Validate an IANA timezone name.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a timezone string from the request, falling back to Asia/Taipei.
 */
export function resolveTimezone(tz: string | undefined): string {
  if (tz && isValidTimezone(tz)) return tz;
  return DEFAULT_TZ;
}

/**
 * Get the UTC offset string (e.g. "+08:00", "-05:00") for a timezone at a given date.
 * Accounts for DST by computing the offset for the specific date.
 */
export function getTimezoneOffset(tz: string, dateStr: string): string {
  try {
    const date = new Date(`${dateStr}T12:00:00Z`);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    // Returns "GMT+08:00", "GMT-05:00", or "GMT" for UTC
    const val = tzPart?.value ?? "";
    if (val === "GMT") return "+00:00";
    const match = val.match(/GMT([+-]\d{2}:\d{2})/);
    return match ? match[1] : "+00:00";
  } catch {
    return "+08:00";
  }
}

/**
 * Build a timestamptz boundary for a date in a timezone.
 * e.g. dateBoundary("2024-03-15", "00:00:00", "Asia/Taipei") → "2024-03-15T00:00:00+08:00"
 */
export function dateBoundary(dateStr: string, time: string, tz: string): string {
  const offset = getTimezoneOffset(tz, dateStr);
  return `${dateStr}T${time}${offset}`;
}

/**
 * Get today's date string (YYYY-MM-DD) in the given timezone.
 */
export function todayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}
