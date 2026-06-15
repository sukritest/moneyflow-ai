import { z } from "zod";

export const budgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  period: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
  categoryId: z.string().optional().nullable(),
  walletId: z.string().optional().nullable(),
  alertThreshold: z.coerce.number().min(0).max(1).default(0.8),
  rollover: z.boolean().default(false),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
