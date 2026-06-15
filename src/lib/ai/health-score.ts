import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { getBudgetsWithSpending } from "@/lib/data/budgets";

function clampScore(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Computes a 0-100 financial health score from the user's recent
 * transactions, goals, and budgets, and persists it to
 * FinancialHealthScore. Pure arithmetic - no AI call required.
 */
export async function computeHealthScore(userId: string) {
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
  const savingsRate = avgIncome > 0 ? (avgIncome - avgExpense) / avgIncome : 0;

  // 1. Savings rate score - 25% savings rate = full score
  const savingsRateScore = clampScore((savingsRate / 0.25) * 100);

  // 2. Emergency fund score - based on dedicated emergency fund goal vs 6 months of expenses
  const [emergencyGoal, wallets] = await Promise.all([
    prisma.goal.findFirst({ where: { userId, type: "emergency_fund" } }),
    prisma.wallet.findMany({ where: { userId }, select: { balance: true } }),
  ]);
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const emergencyFundAmount = emergencyGoal?.currentAmount ?? totalBalance;
  const monthsCovered = avgExpense > 0 ? emergencyFundAmount / avgExpense : emergencyFundAmount > 0 ? 6 : 0;
  const emergencyFundScore = clampScore((monthsCovered / 6) * 100);

  // 3. Budget adherence score - share of active budgets currently within their alert threshold
  const budgets = await getBudgetsWithSpending(userId);
  const budgetAdherenceScore = budgets.length
    ? clampScore((budgets.filter((b) => b.percentUsed <= 1).length / budgets.length) * 100)
    : 70;

  // 4. Debt ratio score - no liability tracking yet, so derive from expense-to-income ratio
  const expenseRatio = avgIncome > 0 ? avgExpense / avgIncome : 1;
  const debtRatioScore = clampScore((1 - Math.max(0, expenseRatio - 0.5) / 0.5) * 100);

  // 5. Spending consistency score - lower month-to-month variance is better
  const expenses = monthlyTotals.map((m) => m.expense);
  const meanExpense = expenses.reduce((s, v) => s + v, 0) / expenses.length;
  const variance = expenses.reduce((s, v) => s + (v - meanExpense) ** 2, 0) / expenses.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = meanExpense > 0 ? stdDev / meanExpense : 0;
  const spendingConsistencyScore = clampScore((1 - coefficientOfVariation) * 100);

  const score = clampScore(
    (savingsRateScore + emergencyFundScore + budgetAdherenceScore + debtRatioScore + spendingConsistencyScore) / 5
  );

  const breakdown = {
    avgIncome,
    avgExpense,
    savingsRate,
    monthsCovered,
    budgetsOnTrack: budgets.filter((b) => b.percentUsed <= 1).length,
    totalBudgets: budgets.length,
    expenseCoefficientOfVariation: coefficientOfVariation,
  };

  return prisma.financialHealthScore.create({
    data: {
      userId,
      score,
      savingsRateScore,
      debtRatioScore,
      emergencyFundScore,
      budgetAdherenceScore,
      spendingConsistencyScore,
      breakdown: JSON.stringify(breakdown),
    },
  });
}
