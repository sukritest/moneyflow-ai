import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { completeOrMock } from "@/lib/openai";

type CategoryLeak = {
  categoryId: string | null;
  name: string;
  current: number;
  average: number;
  deltaPct: number;
};

/**
 * Analyzes recent spending to find categories that grew significantly
 * compared to the trailing 3-month average ("money leaks").
 */
async function findMoneyLeaks(userId: string): Promise<CategoryLeak[]> {
  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);

  const [current, ...previous] = await Promise.all(
    [0, 1, 2, 3].map((i) => {
      const ref = i === 0 ? now : subMonths(now, i);
      const start = i === 0 ? currentStart : startOfMonth(ref);
      const end = i === 0 ? currentEnd : endOfMonth(ref);
      return prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, type: "expense", isExcluded: false, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });
    })
  );

  const avgByCategory = new Map<string | null, number>();
  for (const group of previous.flat()) {
    const prev = avgByCategory.get(group.categoryId) ?? 0;
    avgByCategory.set(group.categoryId, prev + (group._sum.amount ?? 0) / previous.length);
  }

  const categoryIds = [...current.map((c) => c.categoryId), ...avgByCategory.keys()].filter(
    (id): id is string => Boolean(id)
  );
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const leaks: CategoryLeak[] = [];
  for (const group of current) {
    const currentAmount = group._sum.amount ?? 0;
    const average = avgByCategory.get(group.categoryId) ?? 0;
    if (currentAmount < 100) continue; // ignore tiny spend
    const deltaPct = average > 0 ? ((currentAmount - average) / average) * 100 : currentAmount > 0 ? 100 : 0;
    if (deltaPct >= 25 && currentAmount - average >= 50) {
      leaks.push({
        categoryId: group.categoryId,
        name: group.categoryId ? categoryMap.get(group.categoryId)?.name ?? "Uncategorized" : "Uncategorized",
        current: currentAmount,
        average,
        deltaPct,
      });
    }
  }

  return leaks.sort((a, b) => b.deltaPct - a.deltaPct).slice(0, 3);
}

/**
 * Generates a fresh batch of AI insights (money leaks + a monthly
 * summary tip + a positive note when savings rate is healthy) and
 * persists them. Falls back to deterministic templates when no
 * OpenAI key is configured.
 */
export async function generateInsights(userId: string, currency: string) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const [leaks, totals, user] = await Promise.all([
    findMoneyLeaks(userId),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, isExcluded: false, type: { in: ["income", "expense"] }, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const income = totals.find((t) => t.type === "income")?._sum.amount ?? 0;
  const expense = totals.find((t) => t.type === "expense")?._sum.amount ?? 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const created = [];

  for (const leak of leaks) {
    const body = await completeOrMock({
      system:
        "You are a friendly personal finance coach. In 1-2 short sentences, gently point out the spending increase and suggest one concrete action. Be specific and use the numbers given.",
      prompt: `Category "${leak.name}" spending this month is ${leak.current.toFixed(2)} ${currency}, up ${leak.deltaPct.toFixed(0)}% from the recent average of ${leak.average.toFixed(2)} ${currency}. User name: ${user?.name ?? "there"}.`,
      fallback: `Spending on "${leak.name}" is up ${leak.deltaPct.toFixed(0)}% this month (${currency} ${leak.current.toFixed(0)} vs the usual ${currency} ${leak.average.toFixed(0)}). Take a look at recent transactions in this category to see if anything can be trimmed.`,
    });

    created.push(
      await prisma.insight.create({
        data: {
          userId,
          type: "money_leak",
          severity: "warning",
          title: `Possible money leak: ${leak.name}`,
          body,
          data: JSON.stringify(leak),
        },
      })
    );
  }

  const summaryBody = await completeOrMock({
    system:
      "You are a friendly personal finance coach. In 2-3 short sentences, summarize the user's month and give one encouraging, actionable tip. Be specific and use the numbers given.",
    prompt: `This month income is ${income.toFixed(2)} ${currency}, expenses are ${expense.toFixed(2)} ${currency}, savings rate is ${savingsRate.toFixed(1)}%. User name: ${user?.name ?? "there"}.`,
    fallback:
      savingsRate >= 0
        ? `You've saved ${savingsRate.toFixed(0)}% of your income this month (${currency} ${(income - expense).toFixed(0)} set aside). Keep it up by reviewing your largest expense category and setting a small target to trim it further.`
        : `You spent ${currency} ${(expense - income).toFixed(0)} more than you earned this month. Consider reviewing recurring subscriptions and your top spending categories to bring things back into balance.`,
  });

  created.push(
    await prisma.insight.create({
      data: {
        userId,
        type: "monthly",
        severity: savingsRate >= 0 ? "info" : "critical",
        title: "Your monthly summary",
        body: summaryBody,
        data: JSON.stringify({ income, expense, savingsRate }),
      },
    })
  );

  if (savingsRate >= 20) {
    created.push(
      await prisma.insight.create({
        data: {
          userId,
          type: "tip",
          severity: "positive",
          title: "Great savings rate!",
          body: `You're saving ${savingsRate.toFixed(0)}% of your income this month — well above the recommended 20% benchmark. Consider directing some of this surplus toward your goals.`,
          data: JSON.stringify({ savingsRate }),
        },
      })
    );
  }

  return created;
}
