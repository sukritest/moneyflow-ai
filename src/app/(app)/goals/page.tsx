import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalsView } from "@/components/goals/goals-view";

export const metadata: Metadata = {
  title: "Goals | MoneyFlow AI",
};

export default async function GoalsPage() {
  const user = await getActiveUser();

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return <GoalsView initialGoals={goals} defaultCurrency={user.currency} />;
}
