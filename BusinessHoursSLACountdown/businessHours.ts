/**
 * Business hours calculation utilities.
 * Computes the number of working (business) milliseconds between two dates,
 * honoring configured working days and working hours of the day.
 */

export interface IBusinessHoursConfig {
    /** Hour the business day starts (0-23). */
    startHour: number;
    /** Hour the business day ends (0-23). */
    endHour: number;
    /** Set of working weekday numbers (0=Sunday .. 6=Saturday). */
    workingDays: number[];
}

/**
 * Returns the number of business milliseconds remaining between `from` and `to`.
 * If `to` is before `from`, the result is negative (overdue).
 */
export function businessMillisecondsBetween(
    from: Date,
    to: Date,
    config: IBusinessHoursConfig
): number {
    if (from.getTime() === to.getTime()) {
        return 0;
    }

    const overdue = to.getTime() < from.getTime();
    const start = overdue ? to : from;
    const end = overdue ? from : to;

    let total = 0;
    const cursor = new Date(start.getTime());

    // Iterate in small steps but jump efficiently across non-working periods.
    // We walk minute-boundaries only within working windows for accuracy.
    while (cursor.getTime() < end.getTime()) {
        if (isWorkingDay(cursor, config)) {
            const dayStart = new Date(cursor);
            dayStart.setHours(config.startHour, 0, 0, 0);
            const dayEnd = new Date(cursor);
            dayEnd.setHours(config.endHour, 0, 0, 0);

            // Clamp the working window to [cursor, end]
            const windowStart = cursor.getTime() > dayStart.getTime() ? new Date(cursor) : dayStart;
            const windowEnd = end.getTime() < dayEnd.getTime() ? new Date(end) : dayEnd;

            if (windowEnd.getTime() > windowStart.getTime()) {
                total += windowEnd.getTime() - windowStart.getTime();
            }
        }

        // Move cursor to the start of the next day
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(config.startHour, 0, 0, 0);
    }

    return overdue ? -total : total;
}

/**
 * Returns true if the given date falls on a configured working day.
 */
export function isWorkingDay(date: Date, config: IBusinessHoursConfig): boolean {
    return config.workingDays.indexOf(date.getDay()) !== -1;
}

/**
 * Formats a duration in milliseconds as a human-readable string.
 * Uses business-hour semantics: a "day" is one full business day (endHour - startHour hours).
 */
export function formatBusinessDuration(
    ms: number,
    config: IBusinessHoursConfig
): string {
    const absMs = Math.abs(ms);
    const totalMinutes = Math.floor(absMs / 60000);

    const hoursPerDay = Math.max(1, config.endHour - config.startHour);
    const minutesPerDay = hoursPerDay * 60;

    const days = Math.floor(totalMinutes / minutesPerDay);
    const remainingAfterDays = totalMinutes - days * minutesPerDay;
    const hours = Math.floor(remainingAfterDays / 60);
    const minutes = remainingAfterDays % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(" ");
}

/**
 * Parses a comma-separated working days string into an array of numbers.
 * Falls back to Monday-Friday (1-5) if invalid.
 */
export function parseWorkingDays(raw: string | null | undefined): number[] {
    if (!raw) {
        return [1, 2, 3, 4, 5];
    }
    const parsed = raw
        .split(",")
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => !isNaN(d) && d >= 0 && d <= 6);

    return parsed.length > 0 ? parsed : [1, 2, 3, 4, 5];
}
