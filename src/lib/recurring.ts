import { addDays, addWeeks, addMonths, addYears } from "date-fns";

/** Computes the next run date for a recurring transaction given its frequency. */
export function computeNextRunDate(from: Date, frequency: string, dayOfMonth?: number | null): Date {
  switch (frequency) {
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addWeeks(from, 1);
    case "biweekly":
      return addWeeks(from, 2);
    case "yearly":
      return addYears(from, 1);
    case "monthly":
    default: {
      const next = addMonths(from, 1);
      if (dayOfMonth) {
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(dayOfMonth, daysInMonth));
      }
      return next;
    }
  }
}
