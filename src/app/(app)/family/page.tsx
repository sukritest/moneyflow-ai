import type { Metadata } from "next";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FamilyView } from "@/components/family/family-view";

export const metadata: Metadata = {
  title: "Family | MoneyFlow AI",
};

export default async function FamilyPage() {
  const user = await getActiveUser();

  const [membership, myWallets] = await Promise.all([
    prisma.familyMember.findFirst({
      where: { userId: user.id },
      include: {
        familyGroup: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
              orderBy: { joinedAt: "asc" },
            },
            wallets: true,
          },
        },
      },
    }),
    prisma.wallet.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <FamilyView
      initialGroup={membership?.familyGroup ?? null}
      currentUserId={user.id}
      myWallets={myWallets}
      currency={user.currency}
    />
  );
}
