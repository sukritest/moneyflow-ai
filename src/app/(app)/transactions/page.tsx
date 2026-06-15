import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const metadata: Metadata = {
  title: "Transactions | MoneyFlow AI",
};

const PAGE_SIZE = 20;

export default async function TransactionsPage() {
  const user = await getActiveUser();

  const [transactions, total, categories, wallets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      include: { category: true, wallet: true, tags: { include: { tag: true } } },
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null, isSystem: true }] },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
  ]);

  return (
    <TransactionsView
      initialTransactions={transactions}
      initialTotal={total}
      initialTotalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      categories={categories}
      wallets={wallets}
      defaultCurrency={user.currency}
    />
  );
}
