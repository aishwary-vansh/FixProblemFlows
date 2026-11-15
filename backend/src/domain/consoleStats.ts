/**
 * Pure helpers for the FixFlow Console charts. Days and months are UTC, so every console admin sees the same buckets.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

/** One entry per day for the last `days` days (today included), with zero for days that had nothing. */
export const dailySeries = (rows: { day: Date; count: number }[], days: number, now = new Date()) => {
    const counts = new Map(rows.map((row) => [dayKey(row.day), row.count]));
    return Array.from({ length: days }, (_, index) => {
        const date = dayKey(new Date(now.getTime() - (days - 1 - index) * DAY_MS));
        return { date, count: counts.get(date) ?? 0 };
    });
};

/** One entry per month for the last `months` months (this month included), counting the given dates. */
export const monthlySeries = (dates: Date[], months: number, now = new Date()) => {
    const counts = new Map<string, number>();
    for (const date of dates) {
        counts.set(monthKey(date), (counts.get(monthKey(date)) ?? 0) + 1);
    }
    return Array.from({ length: months }, (_, index) => {
        const month = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - index), 1)));
        return { month, count: counts.get(month) ?? 0 };
    });
};
