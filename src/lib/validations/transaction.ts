import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.string().default("THB"),
  date: z.string().min(1, "Date is required"),
  walletId: z.string().min(1, "Wallet is required"),
  categoryId: z.string().optional().nullable(),
  merchant: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["income", "expense", "transfer", "all"]).optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
