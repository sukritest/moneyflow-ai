import { prisma } from "@/lib/prisma";
import { completeOrMock } from "@/lib/openai";
import { getDashboardSummary, getSpendingByCategory } from "@/lib/data/dashboard";
import { getBudgetsWithSpending } from "@/lib/data/budgets";
import { formatCurrency } from "@/lib/utils";

/** Builds a deterministic, rule-based reply when no OpenAI key is set. */
function buildFallbackReply(
  message: string,
  ctx: {
    currency: string;
    income: number;
    expenses: number;
    balance: number;
    totalBalance: number;
    savingsRate: number;
    topCategory?: { name: string; amount: number };
    overBudget: { name: string }[];
    goalsCount: number;
  }
): string {
  const lower = message.toLowerCase();
  const fmt = (n: number) => formatCurrency(n, ctx.currency);

  if (/(balance|wallet|net worth)/.test(lower)) {
    return `Your total balance across wallets is ${fmt(ctx.totalBalance)}. This month you've earned ${fmt(ctx.income)} and spent ${fmt(ctx.expenses)}, leaving a net of ${fmt(ctx.balance)}.`;
  }
  if (/(budget)/.test(lower)) {
    if (ctx.overBudget.length === 0) {
      return "All your budgets are currently within their limits — nice work staying on track!";
    }
    return `Heads up: ${ctx.overBudget.map((b) => b.name).join(", ")} ${ctx.overBudget.length === 1 ? "is" : "are"} over budget this period. Consider reviewing those categories.`;
  }
  if (/(goal|save up|target)/.test(lower)) {
    return ctx.goalsCount > 0
      ? `You currently have ${ctx.goalsCount} active goal${ctx.goalsCount === 1 ? "" : "s"}. Keep contributing regularly — even small, consistent amounts add up over time.`
      : "You don't have any active goals yet. Setting a specific savings goal can help you stay motivated — try adding one from the Goals page.";
  }
  if (/(spend|spending|expense)/.test(lower)) {
    return ctx.topCategory
      ? `Your biggest expense category this month is "${ctx.topCategory.name}" at ${fmt(ctx.topCategory.amount)}. Reviewing recent transactions there could reveal easy savings.`
      : `You've spent ${fmt(ctx.expenses)} so far this month.`;
  }
  if (/(saving|savings rate)/.test(lower)) {
    return `Your savings rate this month is about ${ctx.savingsRate.toFixed(1)}%. A common target is 20% — small reductions in discretionary spending can help you get closer to that.`;
  }
  if (/(hi|hello|hey)/.test(lower)) {
    return "Hi! I'm your MoneyFlow AI assistant. Ask me about your balance, budgets, spending, or savings goals.";
  }

  return `This month you've earned ${fmt(ctx.income)} and spent ${fmt(ctx.expenses)}, for a savings rate of about ${ctx.savingsRate.toFixed(1)}%. Ask me about your budgets, goals, or top spending categories for more specific tips.`;
}

/**
 * Generates an assistant reply for the AI chat, grounded in the user's
 * real financial data. Uses OpenAI if configured, otherwise falls back
 * to a deterministic, rule-based reply built from the same context.
 */
export async function getChatReply(userId: string, message: string, currency: string): Promise<string> {
  const [summary, categories, budgets, activeGoalsCount] = await Promise.all([
    getDashboardSummary(userId),
    getSpendingByCategory(userId),
    getBudgetsWithSpending(userId),
    prisma.goal.count({ where: { userId, status: "active" } }),
  ]);

  const overBudget = budgets.filter((b) => b.percentUsed >= 1).map((b) => ({ name: b.name }));
  const topCategory = categories[0];

  const fallback = buildFallbackReply(message, {
    currency,
    income: summary.income,
    expenses: summary.expenses,
    balance: summary.balance,
    totalBalance: summary.totalBalance,
    savingsRate: summary.savingsRate,
    topCategory: topCategory ? { name: topCategory.name, amount: topCategory.amount } : undefined,
    overBudget,
    goalsCount: activeGoalsCount,
  });

  const contextSummary = [
    `Currency: ${currency}`,
    `This month income: ${summary.income.toFixed(2)}, expenses: ${summary.expenses.toFixed(2)}, savings rate: ${summary.savingsRate.toFixed(1)}%`,
    `Total balance across wallets: ${summary.totalBalance.toFixed(2)}`,
    `Top spending categories: ${categories.slice(0, 5).map((c) => `${c.name} (${c.amount.toFixed(2)})`).join(", ") || "none"}`,
    `Budgets over limit: ${overBudget.map((b) => b.name).join(", ") || "none"}`,
    `Active goals: ${activeGoalsCount}`,
  ].join("\n");

  return completeOrMock({
    system:
      "You are MoneyFlow AI, a helpful and encouraging personal finance assistant. Answer the user's question using the financial context provided. Keep responses concise (2-4 sentences), specific, and actionable. Never give regulated investment advice — speak generally about budgeting, saving, and spending habits.",
    prompt: `Financial context:\n${contextSummary}\n\nUser question: ${message}`,
    fallback,
  });
}
