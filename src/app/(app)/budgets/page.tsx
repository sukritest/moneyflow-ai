import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBudgetsWithSpending } from "@/lib/data/budgets";
import { BudgetsView } from "@/components/budgets/budgets-view";

export const metadata: Metadata = {
  title: "Budgets | MoneyFlow AI",
};

export default async function BudgetsPage() {
  const user = await getActiveUser();

  const [budgets, categories, wallets] = await Promise.all([
    getBudgetsWithSpending(user.id),
    prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null, isSystem: true }] },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
  ]);

  return (
    <BudgetsView
      initialBudgets={budgets}
      categories={categories}
      wallets={wallets}
      defaultCurrency={user.currency}
    />
  );
}
