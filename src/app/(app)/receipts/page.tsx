import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReceiptsView } from "@/components/receipts/receipts-view";

export const metadata: Metadata = {
  title: "Receipts | MoneyFlow AI",
};

export default async function ReceiptsPage() {
  const user = await getActiveUser();

  const [receipts, categories, wallets] = await Promise.all([
    prisma.receipt.findMany({
      where: { userId: user.id },
      include: { transaction: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  return <ReceiptsView initialReceipts={receipts} categories={categories} wallets={wallets} currency={user.currency} />;
}
