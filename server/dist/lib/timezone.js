"use strict";
/**
 * Timezone utilities for converting IANA timezone names to offset strings
 * and computing dates in a user's local timezone.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTimezone = isValidTimezone;
exports.resolveTimezone = resolveTimezone;
exports.getTimezoneOffset = getTimezoneOffset;
exports.dateBoundary = dateBoundary;
exports.todayInTimezone = todayInTimezone;
const DEFAULT_TZ = "Asia/Taipei";
/**
 * Validate an IANA timezone name.
 */
function isValidTimezone(tz) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Resolve a timezone string from the request, falling back to Asia/Taipei.
 */
function resolveTimezone(tz) {
    if (tz && isValidTimezone(tz))
        return tz;
    return DEFAULT_TZ;
}
/**
 * Get the UTC offset string (e.g. "+08:00", "-05:00") for a timezone at a given date.
 * Accounts for DST by computing the offset for the specific date.
 */
function getTimezoneOffset(tz, dateStr) {
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
        if (val === "GMT")
            return "+00:00";
        const match = val.match(/GMT([+-]\d{2}:\d{2})/);
        return match ? match[1] : "+00:00";
    }
    catch {
        return "+08:00";
    }
}
/**
 * Build a timestamptz boundary for a date in a timezone.
 * e.g. dateBoundary("2024-03-15", "00:00:00", "Asia/Taipei") → "2024-03-15T00:00:00+08:00"
 */
function dateBoundary(dateStr, time, tz) {
    const offset = getTimezoneOffset(tz, dateStr);
    return `${dateStr}T${time}${offset}`;
}
/**
 * Get today's date string (YYYY-MM-DD) in the given timezone.
 */
function todayInTimezone(tz) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}
