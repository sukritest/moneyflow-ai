import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecurringView } from "@/components/recurring/recurring-view";

export const metadata: Metadata = {
  title: "Recurring Transactions | MoneyFlow AI",
};

export default async function RecurringPage() {
  const user = await getActiveUser();

  const [recurring, categories, wallets] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      include: { category: true, wallet: true },
      orderBy: { nextRunDate: "asc" },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <RecurringView
      initialRecurring={recurring}
      categories={categories}
      wallets={wallets}
      currency={user.currency}
    />
  );
}
