import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const ESSENTIAL_KEYWORDS = [
  "rent",
  "housing",
  "mortgage",
  "grocer",
  "utilit",
  "insurance",
  "health",
  "medical",
  "transport",
  "loan",
  "debt",
  "education",
  "tuition",
  "childcare",
];

function isEssential(name: string): boolean {
  const lower = name.toLowerCase();
  return ESSENTIAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Builds an "Emergency Financial Mode" plan: how many days of cash
 * runway the user has, a reduced "survival" budget per category,
 * concrete cuts to make, and upcoming must-pay bills. Pure arithmetic.
 */
export async function generateEmergencyPlan(userId: string, currency: string) {
  const now = new Date();
  const months = [0, 1, 2].map((i) => {
    const ref = subMonths(now, i);
    return { start: startOfMonth(ref), end: endOfMonth(ref) };
  });

  const monthlyExpenses = await Promise.all(
    months.map(async ({ start, end }) => {
      const result = await prisma.transaction.aggregate({
        where: { userId, type: "expense", isExcluded: false, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      return result._sum.amount ?? 0;
    })
  );
  const avgMonthlyExpense = monthlyExpenses.reduce((s, v) => s + v, 0) / monthlyExpenses.length;

  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { balance: true } });
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const dailyExpense = avgMonthlyExpense / 30;
  const cashRunwayDays = dailyExpense > 0 ? Math.max(0, Math.floor(totalBalance / dailyExpense)) : 999;

  // Current month spending by category, to build a reduced survival budget.
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "expense", isExcluded: false, date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  const categoryIds = groups.map((g) => g.categoryId).filter((id): id is string => Boolean(id));
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const survivalBudget: Record<string, { current: number; survival: number; essential: boolean }> = {};
  const reductionPlan: string[] = [];

  for (const group of groups) {
    const amount = group._sum.amount ?? 0;
    const name = group.categoryId ? categoryMap.get(group.categoryId)?.name ?? "Uncategorized" : "Uncategorized";
    const essential = isEssential(name);
    const survival = essential ? amount : amount * 0.5;
    survivalBudget[name] = { current: amount, survival, essential };

    if (!essential && amount - survival >= 20) {
      reductionPlan.push(
        `Cut "${name}" spending roughly in half — from ${amount.toFixed(0)} to ${survival.toFixed(0)} ${currency} — to free up ${(amount - survival).toFixed(0)} ${currency}.`
      );
    }
  }

  reductionPlan.push(
    "Pause non-essential subscriptions and recurring memberships until your cash runway improves.",
    "Delay discretionary purchases (dining out, entertainment, shopping) for the duration of this plan.",
    "Reach out to lenders or service providers proactively if you anticipate missing a payment — many offer hardship deferrals."
  );

  const upcoming = await prisma.calendarEvent.findMany({
    where: {
      userId,
      isPaid: false,
      type: { in: ["bill", "loan", "subscription"] },
      dueDate: { gte: now },
    },
    orderBy: { dueDate: "asc" },
    take: 6,
  });

  const priorityPayments = upcoming.map((e) => ({
    title: e.title,
    amount: e.amount ?? 0,
    dueDate: e.dueDate.toISOString(),
    type: e.type,
  }));

  return prisma.emergencyPlan.create({
    data: {
      userId,
      cashRunwayDays,
      survivalBudget: JSON.stringify(survivalBudget),
      reductionPlan: JSON.stringify(reductionPlan),
      priorityPayments: JSON.stringify(priorityPayments),
    },
  });
}
