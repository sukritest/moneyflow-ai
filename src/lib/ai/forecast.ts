import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

const SCENARIO_MULTIPLIERS: Record<string, { income: number; expense: number }> = {
  baseline: { income: 1, expense: 1 },
  optimistic: { income: 1.05, expense: 0.92 },
  pessimistic: { income: 0.95, expense: 1.1 },
};

const FORECAST_MONTHS = 3;

/**
 * Projects income, expenses, and running balance for the next few
 * months based on the trailing 3-month average, adjusted by scenario.
 * Pure arithmetic - works fully offline.
 */
export async function generateForecast(userId: string, scenario: string = "baseline") {
  const now = new Date();
  const months = [0, 1, 2].map((i) => {
    const ref = subMonths(now, i);
    return { start: startOfMonth(ref), end: endOfMonth(ref) };
  });

  const monthlyTotals = await Promise.all(
    months.map(async ({ start, end }) => {
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
      return {
        income: groups.find((g) => g.type === "income")?._sum.amount ?? 0,
        expense: groups.find((g) => g.type === "expense")?._sum.amount ?? 0,
      };
    })
  );

  const avgIncome = monthlyTotals.reduce((s, m) => s + m.income, 0) / monthlyTotals.length;
  const avgExpense = monthlyTotals.reduce((s, m) => s + m.expense, 0) / monthlyTotals.length;

  const multiplier = SCENARIO_MULTIPLIERS[scenario] ?? SCENARIO_MULTIPLIERS.baseline;
  const predictedIncome = avgIncome * multiplier.income;
  const predictedExpense = avgExpense * multiplier.expense;

  const wallets = await prisma.wallet.findMany({ where: { userId }, select: { balance: true } });
  let runningBalance = wallets.reduce((s, w) => s + w.balance, 0);

  const assumptions = JSON.stringify({ avgIncome, avgExpense, scenario, multiplier });

  const forecastMonths = Array.from({ length: FORECAST_MONTHS }, (_, i) => startOfMonth(addMonths(now, i + 1)));

  // Clear previous forecasts for this scenario + month range so re-generating doesn't duplicate.
  await prisma.cashflowForecast.deleteMany({
    where: { userId, scenario, forMonth: { in: forecastMonths } },
  });

  const created = [];
  for (const forMonth of forecastMonths) {
    runningBalance = runningBalance + predictedIncome - predictedExpense;
    created.push(
      await prisma.cashflowForecast.create({
        data: {
          userId,
          forMonth,
          predictedIncome,
          predictedExpense,
          predictedBalance: runningBalance,
          scenario,
          assumptions,
        },
      })
    );
  }

  return created;
}

export async function getForecasts(userId: string, scenario: string = "baseline") {
  const existing = await prisma.cashflowForecast.findMany({
    where: { userId, scenario },
    orderBy: { forMonth: "asc" },
  });
  if (existing.length > 0) return existing;
  return generateForecast(userId, scenario);
}
