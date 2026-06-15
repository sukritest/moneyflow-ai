import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/openai";
import { InsightsView } from "@/components/insights/insights-view";

export const metadata: Metadata = {
  title: "Insights | MoneyFlow AI",
};

export default async function InsightsPage() {
  const user = await getActiveUser();

  const [insights, score] = await Promise.all([
    prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.financialHealthScore.findFirst({
      where: { userId: user.id },
      orderBy: { computedAt: "desc" },
    }),
  ]);

  return <InsightsView initialInsights={insights} initialScore={score} aiEnabled={isAIEnabled} />;
}
