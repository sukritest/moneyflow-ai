import { z } from "zod";

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["bill", "loan", "subscription", "salary", "reminder"]).default("bill"),
  amount: z.coerce.number().optional().nullable(),
  dueDate: z.coerce.date(),
  notifyDaysBefore: z.coerce.number().min(0).max(30).default(3),
  notes: z.string().optional().nullable(),
  walletId: z.string().optional().nullable(),
});

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
