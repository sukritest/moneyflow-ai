import { z } from "zod";

export const recurringSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "yearly"]).default("monthly"),
  dayOfMonth: z.coerce.number().min(1).max(31).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  walletId: z.string().min(1, "Wallet is required"),
  startDate: z.coerce.date().optional(),
  autoCreate: z.boolean().default(true),
});

export type RecurringInput = z.infer<typeof recurringSchema>;
