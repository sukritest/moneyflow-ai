import { prisma } from "@/lib/prisma";
import { completeOrMock } from "@/lib/openai";
import { startOfMonth, endOfMonth, format } from "date-fns";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomSlug() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Computes (and upserts) a MonthlyWrapped summary for the given user/month
 * from their Transaction history. Safe to call repeatedly — it recomputes
 * the stats and updates the existing record if one already exists.
 */
export async function generateMonthlyWrapped(userId: string, monthDate: Date) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      isExcluded: false,
      date: { gte: start, lte: end },
    },
    include: { category: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  let biggestExpense = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
      totalExpense += tx.amount;
      biggestExpense = Math.max(biggestExpense, tx.amount);

      const categoryName = tx.category?.name ?? "Other";
      byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + tx.amount);

      if (tx.merchant) {
        byMerchant.set(tx.merchant, (byMerchant.get(tx.merchant) ?? 0) + tx.amount);
      }
    }
  }

  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topMerchant = [...byMerchant.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? netSavings / totalIncome : 0;

  // Score blends savings rate (0-70 pts) with an "activity" bonus for
  // having tracked transactions at all (0-30 pts), clamped to 0-100.
  const savingsScore = clamp(Math.round(savingsRate * 70 + 35), 0, 70);
  const activityScore = clamp(Math.round((transactions.length / 30) * 30), 0, 30);
  const score = clamp(savingsScore + activityScore, 0, 100);

  const monthLabel = format(start, "MMMM yyyy");
  const fallback =
    totalIncome === 0 && totalExpense === 0
      ? `No transactions recorded for ${monthLabel} yet — log a few to unlock your wrapped.`
      : netSavings >= 0
        ? `You saved ${Math.round(savingsRate * 100)}% of your income in ${monthLabel}${
            topCategory ? `, with ${topCategory} as your biggest spending category` : ""
          }. Nice work — keep the momentum going!`
        : `You spent more than you earned in ${monthLabel}${
            topCategory ? ` — mostly on ${topCategory}` : ""
          }. Consider reviewing your budget for next month.`;

  const savingsAchievement = await completeOrMock({
    system:
      "You are a friendly personal finance coach. Write a single short, encouraging sentence (max 30 words) summarizing the user's monthly financial performance based on the data provided. Be specific and warm, no markdown.",
    prompt: `Month: ${monthLabel}\nTotal income: ${totalIncome}\nTotal expense: ${totalExpense}\nNet savings: ${netSavings}\nSavings rate: ${(savingsRate * 100).toFixed(1)}%\nTop spending category: ${topCategory ?? "none"}\nTop merchant: ${topMerchant ?? "none"}\nTransaction count: ${transactions.length}`,
    fallback,
  });

  const existing = await prisma.monthlyWrapped.findUnique({
    where: { userId_month: { userId, month: start } },
  });

  const wrapped = await prisma.monthlyWrapped.upsert({
    where: { userId_month: { userId, month: start } },
    create: {
      userId,
      month: start,
      totalIncome,
      totalExpense,
      netSavings,
      topCategory,
      topMerchant,
      biggestExpense: transactions.some((t) => t.type === "expense") ? biggestExpense : null,
      savingsAchievement: savingsAchievement.trim(),
      score,
      shareSlug: existing?.shareSlug ?? `${format(start, "yyyy-MM")}-${randomSlug()}`,
    },
    update: {
      totalIncome,
      totalExpense,
      netSavings,
      topCategory,
      topMerchant,
      biggestExpense: transactions.some((t) => t.type === "expense") ? biggestExpense : null,
      savingsAchievement: savingsAchievement.trim(),
      score,
      generatedAt: new Date(),
    },
  });

  return wrapped;
}
