import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["saving", "emergency_fund", "travel", "car", "house", "custom"]).default("custom"),
  icon: z.string().default("target"),
  targetAmount: z.coerce.number().positive("Target amount must be greater than 0"),
  currentAmount: z.coerce.number().min(0).default(0),
  targetDate: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["active", "completed", "paused", "cancelled"]).default("active"),
  monthlyContribution: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type GoalInput = z.infer<typeof goalSchema>;

export const contributionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  note: z.string().optional().nullable(),
});

export type ContributionInput = z.infer<typeof contributionSchema>;
