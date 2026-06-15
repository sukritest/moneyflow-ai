import { prisma } from "@/lib/prisma";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";

export type DashboardSummary = {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  incomeLastMonth: number;
  expensesLastMonth: number;
  incomeDelta: number;
  expensesDelta: number;
  totalBalance: number;
};

export type CategorySpend = {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  amount: number;
};

export type MonthlyTrendPoint = {
  month: string;
  label: string;
  income: number;
  expense: number;
};

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [thisMonth, lastMonth, wallets] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        isExcluded: false,
        type: { in: ["income", "expense"] },
        date: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        isExcluded: false,
        type: { in: ["income", "expense"] },
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.wallet.findMany({ where: { userId }, select: { balance: true } }),
  ]);

  const income = thisMonth.find((g) => g.type === "income")?._sum.amount ?? 0;
  const expenses = thisMonth.find((g) => g.type === "expense")?._sum.amount ?? 0;
  const incomeLastMonth = lastMonth.find((g) => g.type === "income")?._sum.amount ?? 0;
  const expensesLastMonth = lastMonth.find((g) => g.type === "expense")?._sum.amount ?? 0;

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  return {
    income,
    expenses,
    balance: income - expenses,
    savingsRate,
    incomeLastMonth,
    expensesLastMonth,
    incomeDelta: percentDelta(income, incomeLastMonth),
    expensesDelta: percentDelta(expenses, expensesLastMonth),
    totalBalance,
  };
}

export async function getSpendingByCategory(userId: string): Promise<CategorySpend[]> {
  const now = new Date();
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "expense",
      isExcluded: false,
      date: { gte: startOfMonth(now), lte: endOfMonth(now) },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const categoryIds = groups.map((g) => g.categoryId).filter((id): id is string => Boolean(id));
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return groups.map((g) => {
    const category = g.categoryId ? categoryMap.get(g.categoryId) : undefined;
    return {
      categoryId: g.categoryId,
      name: category?.name ?? "Uncategorized",
      color: category?.color ?? "#94a3b8",
      icon: category?.icon ?? "circle",
      amount: g._sum.amount ?? 0,
    };
  });
}

export async function getMonthlyTrend(userId: string, months = 6): Promise<MonthlyTrendPoint[]> {
  const now = new Date();
  const points: MonthlyTrendPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const groups = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        isExcluded: false,
        type: { in: ["income", "expense"] },
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    points.push({
      month: format(monthDate, "yyyy-MM"),
      label: format(monthDate, "MMM"),
      income: groups.find((g) => g.type === "income")?._sum.amount ?? 0,
      expense: groups.find((g) => g.type === "expense")?._sum.amount ?? 0,
    });
  }

  return points;
}

export async function getRecentTransactions(userId: string, limit = 5) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    include: { category: true, wallet: true },
  });
}

export async function getLatestHealthScore(userId: string) {
  return prisma.financialHealthScore.findFirst({
    where: { userId },
    orderBy: { computedAt: "desc" },
  });
}
