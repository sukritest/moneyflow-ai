import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import type { Budget, Category, Wallet } from "@prisma/client";

export type BudgetWithProgress = Budget & {
  category: Category | null;
  wallet: Wallet | null;
  spent: number;
  remaining: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
};

export function getPeriodRange(period: string, reference: Date = new Date()) {
  switch (period) {
    case "weekly":
      return { start: startOfWeek(reference, { weekStartsOn: 1 }), end: endOfWeek(reference, { weekStartsOn: 1 }) };
    case "yearly":
      return { start: startOfYear(reference), end: endOfYear(reference) };
    case "monthly":
    default:
      return { start: startOfMonth(reference), end: endOfMonth(reference) };
  }
}

/**
 * Fetch all budgets for a user, each annotated with how much has been spent
 * in the current period (based on the budget's category/wallet scope).
 */
export async function getBudgetsWithSpending(userId: string): Promise<BudgetWithProgress[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true, wallet: true },
    orderBy: [{ categoryId: "asc" }, { createdAt: "asc" }],
  });

  const results: BudgetWithProgress[] = [];

  for (const budget of budgets) {
    const { start, end } = getPeriodRange(budget.period, new Date());

    const aggregate = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "expense",
        isExcluded: false,
        date: { gte: start, lte: end },
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
        ...(budget.walletId ? { walletId: budget.walletId } : {}),
      },
      _sum: { amount: true },
    });

    const spent = aggregate._sum.amount ?? 0;
    const remaining = budget.amount - spent;
    const percentUsed = budget.amount > 0 ? spent / budget.amount : 0;

    results.push({
      ...budget,
      spent,
      remaining,
      percentUsed,
      periodStart: start,
      periodEnd: end,
    });
  }

  return results;
}
