/**
 * Timezone utilities for converting IANA timezone names to offset strings
 * and computing dates in a user's local timezone.
 */
/**
 * Validate an IANA timezone name.
 */
export declare function isValidTimezone(tz: string): boolean;
/**
 * Resolve a timezone string from the request, falling back to Asia/Taipei.
 */
export declare function resolveTimezone(tz: string | undefined): string;
/**
 * Get the UTC offset string (e.g. "+08:00", "-05:00") for a timezone at a given date.
 * Accounts for DST by computing the offset for the specific date.
 */
export declare function getTimezoneOffset(tz: string, dateStr: string): string;
/**
 * Build a timestamptz boundary for a date in a timezone.
 * e.g. dateBoundary("2024-03-15", "00:00:00", "Asia/Taipei") → "2024-03-15T00:00:00+08:00"
 */
export declare function dateBoundary(dateStr: string, time: string, tz: string): string;
/**
 * Get today's date string (YYYY-MM-DD) in the given timezone.
 */
export declare function todayInTimezone(tz: string): string;
