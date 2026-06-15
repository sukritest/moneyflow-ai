import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const forecastSchema = z.object({
  scenario: z.enum(["baseline", "optimistic", "pessimistic"]).default("baseline"),
});
export type ForecastInput = z.infer<typeof forecastSchema>;

export const salaryAllocationSchema = z
  .object({
    salaryAmount: z.coerce.number().positive("Salary must be greater than 0"),
    savingsPct: z.coerce.number().min(0).max(100),
    investmentPct: z.coerce.number().min(0).max(100),
    billsPct: z.coerce.number().min(0).max(100),
    spendingPct: z.coerce.number().min(0).max(100),
  })
  .refine((data) => {
    const total = data.savingsPct + data.investmentPct + data.billsPct + data.spendingPct;
    return Math.abs(total - 100) < 0.5;
  }, { message: "Percentages must add up to 100%", path: ["spendingPct"] });
export type SalaryAllocationInput = z.infer<typeof salaryAllocationSchema>;
